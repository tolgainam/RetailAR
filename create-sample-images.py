#!/usr/bin/env python3
"""
Create sample reference images for demo purposes
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_sample_image(width, height, background_color, text, text_color, filename):
    """Create a simple colored rectangle with text"""
    img = Image.new('RGB', (width, height), background_color)
    draw = ImageDraw.Draw(img)
    
    # Try to use a font, fallback to default if not available
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 24)
    except:
        font = ImageFont.load_default()
    
    # Get text size and position it in center
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (width - text_width) // 2
    y = (height - text_height) // 2
    
    draw.text((x, y), text, fill=text_color, font=font)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    img.save(filename)
    print(f"Created: {filename}")

def create_product_images():
    """Create sample images for all demo products"""
    
    # TEREA Yellow
    base_path = "assets/products/terea-yellow/reference-images/"
    create_sample_image(512, 512, (255, 215, 0), "TEREA\nYellow", (139, 69, 19), f"{base_path}front.jpg")
    create_sample_image(512, 300, (255, 215, 0), "TEREA Y", (139, 69, 19), f"{base_path}side.jpg")
    create_sample_image(400, 400, (255, 215, 0), "TEREA\nYELLOW", (139, 69, 19), f"{base_path}angle_45.jpg")
    create_sample_image(200, 200, (255, 215, 0), "IQOS", (139, 69, 19), f"{base_path}logo.jpg")
    create_sample_image(512, 200, (255, 215, 0), "TEREA", (139, 69, 19), f"{base_path}top.jpg")
    
    # TEREA Sienna
    base_path = "assets/products/terea-sienna/reference-images/"
    create_sample_image(512, 512, (139, 69, 19), "TEREA\nSienna", (255, 255, 255), f"{base_path}front.jpg")
    create_sample_image(512, 300, (139, 69, 19), "TEREA S", (255, 255, 255), f"{base_path}side.jpg")
    create_sample_image(400, 400, (139, 69, 19), "TEREA\nSIENNA", (255, 255, 255), f"{base_path}angle_45.jpg")
    create_sample_image(200, 200, (139, 69, 19), "IQOS", (255, 255, 255), f"{base_path}logo.jpg")
    create_sample_image(512, 200, (139, 69, 19), "TEREA", (255, 255, 255), f"{base_path}top.jpg")
    
    # ZYN Cool Mint
    base_path = "assets/products/zyn-can-1/reference-images/"
    create_sample_image(512, 512, (0, 191, 255), "ZYN\nCool Mint", (255, 255, 255), f"{base_path}front.jpg")
    create_sample_image(300, 512, (0, 191, 255), "ZYN\nMINT", (255, 255, 255), f"{base_path}side.jpg")
    create_sample_image(512, 512, (0, 191, 255), "ZYN", (255, 255, 255), f"{base_path}top.jpg")
    create_sample_image(400, 400, (0, 191, 255), "ZYN\nCOOL\nMINT", (255, 255, 255), f"{base_path}angle_30.jpg")
    create_sample_image(200, 200, (0, 191, 255), "ZYN", (255, 255, 255), f"{base_path}logo.jpg")
    
    # ZYN Citrus
    base_path = "assets/products/zyn-can-2/reference-images/"
    create_sample_image(512, 512, (255, 165, 0), "ZYN\nCitrus", (255, 255, 255), f"{base_path}front.jpg")
    create_sample_image(300, 512, (255, 165, 0), "ZYN\nCITRUS", (255, 255, 255), f"{base_path}side.jpg")
    create_sample_image(512, 512, (255, 165, 0), "ZYN", (255, 255, 255), f"{base_path}top.jpg")
    create_sample_image(400, 400, (255, 165, 0), "ZYN\nCITRUS", (255, 255, 255), f"{base_path}angle_30.jpg")
    create_sample_image(200, 200, (255, 165, 0), "ZYN", (255, 255, 255), f"{base_path}logo.jpg")

if __name__ == "__main__":
    print("Creating sample reference images...")
    create_product_images()
    print("✅ Sample images created successfully!")
    print("\nTo run the server:")
    print("  python3 server.py")