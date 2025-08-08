#!/usr/bin/env python3
"""
TensorFlow Model Training Script for Product Recognition
Trains a custom CNN model for IQOS/VEEV/ZYN product classification.
"""

import os
import json
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from pathlib import Path
import argparse
from datetime import datetime
import matplotlib.pyplot as plt
from sklearn.metrics import classification_report, confusion_matrix
import seaborn as sns

# Product categories (must match augmentation script)
PRODUCTS = [
    'zyn-apple-mint',
    'zyn-spearmint', 
    'terea-yellow',
    'terea-sienna',
    'iqos-iluma-prime'
]

def create_data_generators(train_dir, val_dir, batch_size=32, img_size=(224, 224)):
    """Create data generators for training and validation."""
    
    # Data preprocessing and augmentation for training
    train_datagen = keras.preprocessing.image.ImageDataGenerator(
        rescale=1./255,
        rotation_range=5,      # Light additional augmentation
        width_shift_range=0.05,
        height_shift_range=0.05,
        brightness_range=[0.95, 1.05],
        horizontal_flip=False,  # Don't flip products (text would be backwards)
        validation_split=0.0
    )
    
    # Only rescaling for validation
    val_datagen = keras.preprocessing.image.ImageDataGenerator(
        rescale=1./255
    )
    
    # Create generators
    train_generator = train_datagen.flow_from_directory(
        train_dir,
        target_size=img_size,
        batch_size=batch_size,
        class_mode='categorical',
        classes=PRODUCTS,  # Ensure consistent class ordering
        shuffle=True
    )
    
    val_generator = val_datagen.flow_from_directory(
        val_dir,
        target_size=img_size,
        batch_size=batch_size,
        class_mode='categorical',
        classes=PRODUCTS,  # Ensure consistent class ordering
        shuffle=False
    )
    
    return train_generator, val_generator

def create_model(num_classes=5, input_shape=(224, 224, 3)):
    """Create a simple CNN model that's compatible with TensorFlow.js."""
    
    model = keras.Sequential([
        # Input layer
        layers.Input(shape=input_shape),
        
        # First conv block
        layers.Conv2D(32, (3, 3), activation='relu', padding='same'),
        layers.BatchNormalization(),
        layers.MaxPooling2D((2, 2)),
        layers.Dropout(0.25),
        
        # Second conv block
        layers.Conv2D(64, (3, 3), activation='relu', padding='same'),
        layers.BatchNormalization(), 
        layers.MaxPooling2D((2, 2)),
        layers.Dropout(0.25),
        
        # Third conv block
        layers.Conv2D(128, (3, 3), activation='relu', padding='same'),
        layers.BatchNormalization(),
        layers.MaxPooling2D((2, 2)),
        layers.Dropout(0.25),
        
        # Fourth conv block
        layers.Conv2D(256, (3, 3), activation='relu', padding='same'),
        layers.BatchNormalization(),
        layers.GlobalAveragePooling2D(),
        layers.Dropout(0.5),
        
        # Classification head
        layers.Dense(512, activation='relu'),
        layers.Dropout(0.5),
        layers.Dense(256, activation='relu'),
        layers.Dropout(0.3),
        layers.Dense(num_classes, activation='softmax', name='predictions')
    ])
    
    return model, None  # No base model in this simple architecture

def create_callbacks(model_dir, patience=10):
    """Create training callbacks for monitoring and saving."""
    
    callbacks = [
        # Save best model
        keras.callbacks.ModelCheckpoint(
            filepath=model_dir / 'best_model.h5',
            monitor='val_accuracy',
            save_best_only=True,
            save_weights_only=False,
            verbose=1
        ),
        
        # Early stopping
        keras.callbacks.EarlyStopping(
            monitor='val_accuracy',
            patience=patience,
            restore_best_weights=True,
            verbose=1
        ),
        
        # Reduce learning rate on plateau
        keras.callbacks.ReduceLROnPlateau(
            monitor='val_accuracy',
            factor=0.5,
            patience=5,
            min_lr=1e-7,
            verbose=1
        ),
        
        # TensorBoard logging
        keras.callbacks.TensorBoard(
            log_dir=model_dir / 'logs',
            histogram_freq=1,
            write_graph=True,
            write_images=True
        )
    ]
    
    return callbacks

def plot_training_history(history, output_dir):
    """Plot and save training history."""
    
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 12))
    
    # Accuracy
    ax1.plot(history.history['accuracy'], label='Training Accuracy', linewidth=2)
    ax1.plot(history.history['val_accuracy'], label='Validation Accuracy', linewidth=2)
    ax1.set_title('Model Accuracy', fontsize=14, fontweight='bold')
    ax1.set_xlabel('Epoch')
    ax1.set_ylabel('Accuracy')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # Loss
    ax2.plot(history.history['loss'], label='Training Loss', linewidth=2)
    ax2.plot(history.history['val_loss'], label='Validation Loss', linewidth=2)
    ax2.set_title('Model Loss', fontsize=14, fontweight='bold')
    ax2.set_xlabel('Epoch')
    ax2.set_ylabel('Loss')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    # Learning rate
    if 'lr' in history.history:
        ax3.plot(history.history['lr'], linewidth=2, color='orange')
        ax3.set_title('Learning Rate', fontsize=14, fontweight='bold')
        ax3.set_xlabel('Epoch')
        ax3.set_ylabel('Learning Rate')
        ax3.set_yscale('log')
        ax3.grid(True, alpha=0.3)
    
    # Top predictions confidence (if available)
    ax4.text(0.5, 0.5, f'Final Validation Accuracy: {max(history.history["val_accuracy"]):.4f}', 
             ha='center', va='center', fontsize=16, fontweight='bold',
             transform=ax4.transAxes)
    ax4.axis('off')
    
    plt.tight_layout()
    plt.savefig(output_dir / 'training_history.png', dpi=300, bbox_inches='tight')
    plt.close()

def evaluate_model(model, val_generator, output_dir):
    """Evaluate model and generate classification report."""
    
    # Get predictions
    val_generator.reset()
    predictions = model.predict(val_generator, verbose=1)
    predicted_classes = np.argmax(predictions, axis=1)
    
    # Get true labels
    true_classes = val_generator.classes[:len(predicted_classes)]
    
    # Generate classification report
    report = classification_report(
        true_classes, 
        predicted_classes, 
        target_names=PRODUCTS,
        output_dict=True
    )
    
    # Save classification report
    with open(output_dir / 'classification_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    # Print readable report
    print("\n" + "="*50)
    print("CLASSIFICATION REPORT")
    print("="*50)
    print(classification_report(true_classes, predicted_classes, target_names=PRODUCTS))
    
    # Generate confusion matrix
    cm = confusion_matrix(true_classes, predicted_classes)
    
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                xticklabels=PRODUCTS, yticklabels=PRODUCTS)
    plt.title('Confusion Matrix', fontsize=16, fontweight='bold')
    plt.xlabel('Predicted', fontsize=12)
    plt.ylabel('Actual', fontsize=12)
    plt.tight_layout()
    plt.savefig(output_dir / 'confusion_matrix.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    # Calculate per-class accuracy
    per_class_accuracy = {}
    for i, product in enumerate(PRODUCTS):
        mask = true_classes == i
        if np.sum(mask) > 0:
            accuracy = np.sum(predicted_classes[mask] == i) / np.sum(mask)
            per_class_accuracy[product] = accuracy
    
    return report, per_class_accuracy


def main():
    parser = argparse.ArgumentParser(description='Train TensorFlow model for product recognition')
    parser.add_argument('--data-dir', type=Path, default='../data/splits',
                       help='Directory containing train/val splits')
    parser.add_argument('--model-dir', type=Path, default='../models',
                       help='Output directory for trained models')
    parser.add_argument('--batch-size', type=int, default=32,
                       help='Training batch size')
    parser.add_argument('--epochs', type=int, default=50,
                       help='Number of training epochs')
    parser.add_argument('--img-size', type=int, nargs=2, default=[224, 224],
                       help='Input image size')
    parser.add_argument('--learning-rate', type=float, default=1e-3,
                       help='Initial learning rate')
    
    args = parser.parse_args()
    
    # Create output directory
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_dir = args.model_dir / f"training_{timestamp}"
    model_dir.mkdir(parents=True, exist_ok=True)
    
    print("🚀 Starting TensorFlow model training...")
    print(f"📁 Data directory: {args.data_dir}")
    print(f"💾 Model output: {model_dir}")
    print(f"📊 Products: {PRODUCTS}")
    print(f"🔧 Batch size: {args.batch_size}")
    print(f"⏰ Epochs: {args.epochs}")
    
    # Check if data exists
    train_dir = args.data_dir / 'train'
    val_dir = args.data_dir / 'val'
    
    if not train_dir.exists() or not val_dir.exists():
        print("❌ Training data not found!")
        print("Please run augment_images.py first to generate training data.")
        return
    
    # Create data generators
    print("\n📊 Creating data generators...")
    train_generator, val_generator = create_data_generators(
        train_dir, val_dir, args.batch_size, tuple(args.img_size)
    )
    
    print(f"📈 Training samples: {train_generator.samples}")
    print(f"📉 Validation samples: {val_generator.samples}")
    print(f"🏷️  Classes: {train_generator.class_indices}")
    
    # Create model
    print("\n🧠 Creating model architecture...")
    model, base_model = create_model(
        num_classes=len(PRODUCTS), 
        input_shape=(*args.img_size, 3)
    )
    
    # Compile model
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=args.learning_rate),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    # Print model summary
    model.summary()
    
    # Create callbacks
    callbacks = create_callbacks(model_dir)
    
    # Save model architecture
    model_json = model.to_json()
    with open(model_dir / 'model_architecture.json', 'w') as f:
        f.write(model_json)
    
    # Save training configuration
    config = {
        'products': PRODUCTS,
        'batch_size': args.batch_size,
        'epochs': args.epochs,
        'img_size': args.img_size,
        'learning_rate': args.learning_rate,
        'training_samples': train_generator.samples,
        'validation_samples': val_generator.samples,
        'timestamp': timestamp
    }
    
    with open(model_dir / 'training_config.json', 'w') as f:
        json.dump(config, f, indent=2)
    
    # Training phase: End-to-end training
    print("\n🎓 Training model...")
    history = model.fit(
        train_generator,
        epochs=args.epochs,
        validation_data=val_generator,
        callbacks=callbacks,
        verbose=1
    )
    
    # Plot training history
    print("\n📊 Generating training plots...")
    plot_training_history(history, model_dir)
    
    # Evaluate model
    print("\n🔍 Evaluating model...")
    report, per_class_accuracy = evaluate_model(model, val_generator, model_dir)
    
    # Save final model
    model.save(model_dir / 'final_model.h5')
    
    # Print summary
    print("\n" + "="*60)
    print("🎉 TRAINING COMPLETE!")
    print("="*60)
    print(f"📁 Models saved to: {model_dir}")
    print(f"🎯 Final validation accuracy: {max(history.history['val_accuracy']):.4f}")
    print("\n📊 Per-class accuracy:")
    for product, accuracy in per_class_accuracy.items():
        print(f"  {product}: {accuracy:.4f}")
    
    print(f"\n📝 Next steps:")
    print(f"1. Run: python convert_tfjs.py --model-path {model_dir}/final_model.h5")
    print(f"2. Copy TensorFlow.js model to your web app")
    print(f"3. Test the model in your WebAR application!")
    
    return model_dir

if __name__ == "__main__":
    main()