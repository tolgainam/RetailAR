/**
 * Model Factory
 * Creates and manages different ML model instances
 */

import { MLModelManager } from './model-manager.js';
import { EfficientNetModelManager } from './efficientnet-model-manager.js';

export class ModelFactory {
    static MODEL_TYPES = {
        CNN: 'cnn',
        EFFICIENTNET: 'efficientnet'
    };
    
    static createModel(modelType) {
        switch (modelType.toLowerCase()) {
            case ModelFactory.MODEL_TYPES.CNN:
                return new MLModelManager();
                
            case ModelFactory.MODEL_TYPES.EFFICIENTNET:
                return new EfficientNetModelManager();
                
            default:
                throw new Error(`Unknown model type: ${modelType}`);
        }
    }
    
    static getAvailableModels() {
        return [
            {
                type: ModelFactory.MODEL_TYPES.CNN,
                name: 'Custom CNN',
                description: 'Current production model - 85% accuracy',
                size: '~5MB',
                performance: 'Excellent',
                accuracy: '85%'
            },
            {
                type: ModelFactory.MODEL_TYPES.EFFICIENTNET,
                name: 'EfficientNet-Lite',
                description: 'Advanced model - 89-93% expected accuracy',
                size: '~25MB',
                performance: 'Good',
                accuracy: '89-93%'
            }
        ];
    }
}