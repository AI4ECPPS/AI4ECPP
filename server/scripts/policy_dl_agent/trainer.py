"""
Policy Model Trainer
Handles training, validation, and evaluation of the Transformer model.
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.optim.lr_scheduler import ReduceLROnPlateau, CosineAnnealingWarmRestarts
import numpy as np
from typing import Dict, List, Optional, Tuple, Callable
import time
import json

from model import PanelTransformer
from data_processor import create_batches


class PolicyTrainer:
    """Trainer for the Panel Transformer model."""
    
    def __init__(
        self,
        model: PanelTransformer,
        learning_rate: float = 1e-4,
        weight_decay: float = 1e-5,
        device: str = 'cpu',
        scheduler_type: str = 'plateau'
    ):
        self.model = model
        self.device = device
        self.model.to(device)
        
        # Optimizer
        self.optimizer = optim.AdamW(
            model.parameters(),
            lr=learning_rate,
            weight_decay=weight_decay
        )
        
        # Learning rate scheduler
        if scheduler_type == 'plateau':
            self.scheduler = ReduceLROnPlateau(
                self.optimizer, mode='min', factor=0.5, patience=5
            )
        else:
            self.scheduler = CosineAnnealingWarmRestarts(
                self.optimizer, T_0=10, T_mult=2
            )
        self.scheduler_type = scheduler_type
        
        # Loss function
        self.criterion = nn.MSELoss()
        
        # Training history
        self.history = {
            'train_loss': [],
            'val_loss': [],
            'learning_rate': [],
            'epoch_time': []
        }
        
        # Best model tracking
        self.best_val_loss = float('inf')
        self.best_model_state = None
    
    def train_epoch(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        entity_train: np.ndarray,
        batch_size: int
    ) -> float:
        """Train for one epoch."""
        self.model.train()
        total_loss = 0.0
        n_batches = 0
        
        batches = create_batches(X_train, y_train, entity_train, batch_size)
        
        for X_batch, y_batch, entity_batch in batches:
            # Convert to tensors
            X = torch.tensor(X_batch, dtype=torch.float32).to(self.device)
            y = torch.tensor(y_batch, dtype=torch.float32).to(self.device)
            entity_ids = torch.tensor(entity_batch, dtype=torch.long).to(self.device)
            
            # Forward pass
            self.optimizer.zero_grad()
            predictions, _ = self.model(X, entity_ids)
            
            # Compute loss
            loss = self.criterion(predictions, y)
            
            # Backward pass
            loss.backward()
            
            # Gradient clipping
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
            
            self.optimizer.step()
            
            total_loss += loss.item()
            n_batches += 1
        
        return total_loss / n_batches
    
    def validate(
        self,
        X_val: np.ndarray,
        y_val: np.ndarray,
        entity_val: np.ndarray,
        batch_size: int
    ) -> Tuple[float, Dict]:
        """Validate the model."""
        self.model.eval()
        total_loss = 0.0
        n_batches = 0
        
        all_predictions = []
        all_targets = []
        
        with torch.no_grad():
            batches = create_batches(X_val, y_val, entity_val, batch_size)
            
            for X_batch, y_batch, entity_batch in batches:
                X = torch.tensor(X_batch, dtype=torch.float32).to(self.device)
                y = torch.tensor(y_batch, dtype=torch.float32).to(self.device)
                entity_ids = torch.tensor(entity_batch, dtype=torch.long).to(self.device)
                
                predictions, _ = self.model(X, entity_ids)
                loss = self.criterion(predictions, y)
                
                total_loss += loss.item()
                n_batches += 1
                
                all_predictions.append(predictions.cpu().numpy())
                all_targets.append(y_batch)
        
        avg_loss = total_loss / n_batches
        
        # Compute additional metrics
        predictions = np.concatenate(all_predictions, axis=0)
        targets = np.concatenate(all_targets, axis=0)
        
        metrics = self._compute_metrics(predictions, targets)
        metrics['loss'] = avg_loss
        
        return avg_loss, metrics
    
    def _compute_metrics(self, predictions: np.ndarray, targets: np.ndarray) -> Dict:
        """Compute evaluation metrics."""
        # Flatten for overall metrics
        pred_flat = predictions.flatten()
        target_flat = targets.flatten()
        
        # MSE
        mse = np.mean((pred_flat - target_flat) ** 2)
        
        # RMSE
        rmse = np.sqrt(mse)
        
        # MAE
        mae = np.mean(np.abs(pred_flat - target_flat))
        
        # R-squared
        ss_res = np.sum((target_flat - pred_flat) ** 2)
        ss_tot = np.sum((target_flat - np.mean(target_flat)) ** 2)
        r2 = 1 - (ss_res / (ss_tot + 1e-8))
        
        # MAPE (Mean Absolute Percentage Error)
        mask = np.abs(target_flat) > 1e-8
        if np.any(mask):
            mape = np.mean(np.abs((target_flat[mask] - pred_flat[mask]) / target_flat[mask])) * 100
        else:
            mape = 0.0
        
        return {
            'mse': float(mse),
            'rmse': float(rmse),
            'mae': float(mae),
            'r2': float(r2),
            'mape': float(mape)
        }
    
    def train(
        self,
        data: Dict,
        epochs: int = 100,
        batch_size: int = 32,
        early_stopping_patience: int = 15,
        callback: Optional[Callable] = None
    ) -> Dict:
        """
        Full training loop.
        
        Args:
            data: Dictionary with training/validation data
            epochs: Number of training epochs
            batch_size: Batch size
            early_stopping_patience: Patience for early stopping
            callback: Optional callback function called after each epoch
            
        Returns:
            Training history and best metrics
        """
        patience_counter = 0
        
        for epoch in range(epochs):
            start_time = time.time()
            
            # Training
            train_loss = self.train_epoch(
                data['X_train'], data['y_train'], data['entity_train'], batch_size
            )
            
            # Validation
            val_loss, val_metrics = self.validate(
                data['X_val'], data['y_val'], data['entity_val'], batch_size
            )
            
            epoch_time = time.time() - start_time
            
            # Update learning rate scheduler
            if self.scheduler_type == 'plateau':
                self.scheduler.step(val_loss)
            else:
                self.scheduler.step()
            
            current_lr = self.optimizer.param_groups[0]['lr']
            
            # Record history
            self.history['train_loss'].append(train_loss)
            self.history['val_loss'].append(val_loss)
            self.history['learning_rate'].append(current_lr)
            self.history['epoch_time'].append(epoch_time)
            
            # Check for best model
            if val_loss < self.best_val_loss:
                self.best_val_loss = val_loss
                self.best_model_state = {k: v.cpu().clone() for k, v in self.model.state_dict().items()}
                patience_counter = 0
            else:
                patience_counter += 1
            
            # Callback
            if callback:
                callback({
                    'epoch': epoch + 1,
                    'train_loss': train_loss,
                    'val_loss': val_loss,
                    'metrics': val_metrics,
                    'lr': current_lr,
                    'time': epoch_time,
                    'best_val_loss': self.best_val_loss
                })
            
            # Early stopping
            if patience_counter >= early_stopping_patience:
                print(f"Early stopping at epoch {epoch + 1}")
                break
        
        # Restore best model
        if self.best_model_state:
            self.model.load_state_dict(self.best_model_state)
        
        # Final evaluation on test set
        test_loss, test_metrics = self.validate(
            data['X_test'], data['y_test'], data['entity_test'], batch_size
        )
        
        return {
            'history': self.history,
            'best_val_loss': self.best_val_loss,
            'test_metrics': test_metrics,
            'epochs_trained': len(self.history['train_loss'])
        }
    
    def save_checkpoint(self, path: str, data_params: Dict = None):
        """Save model checkpoint."""
        checkpoint = {
            'model_state_dict': self.model.state_dict(),
            'model_config': self.model.get_config(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'history': self.history,
            'best_val_loss': self.best_val_loss
        }
        if data_params:
            checkpoint['data_params'] = data_params
        torch.save(checkpoint, path)
    
    def load_checkpoint(self, path: str) -> Dict:
        """Load model checkpoint."""
        checkpoint = torch.load(path, map_location=self.device)
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        self.history = checkpoint.get('history', self.history)
        self.best_val_loss = checkpoint.get('best_val_loss', float('inf'))
        return checkpoint


def compute_feature_importance(
    model: PanelTransformer,
    X: np.ndarray,
    entity_ids: np.ndarray,
    feature_names: List[str],
    device: str = 'cpu'
) -> Dict[str, float]:
    """
    Compute feature importance using permutation importance.
    
    Args:
        model: Trained model
        X: Input data [batch, lookback, n_features]
        entity_ids: Entity IDs
        feature_names: List of feature names
        device: Device to use
        
    Returns:
        Dictionary mapping feature names to importance scores
    """
    model.eval()
    model.to(device)
    
    X_tensor = torch.tensor(X, dtype=torch.float32).to(device)
    entity_tensor = torch.tensor(entity_ids, dtype=torch.long).to(device)
    
    # Get baseline predictions
    with torch.no_grad():
        baseline_pred, _ = model(X_tensor, entity_tensor)
        baseline_pred = baseline_pred.cpu().numpy()
    
    importance_scores = {}
    
    for i, feature_name in enumerate(feature_names):
        # Permute feature i
        X_permuted = X.copy()
        permuted_indices = np.random.permutation(X.shape[0])
        X_permuted[:, :, i] = X[permuted_indices, :, i]
        
        X_permuted_tensor = torch.tensor(X_permuted, dtype=torch.float32).to(device)
        
        with torch.no_grad():
            permuted_pred, _ = model(X_permuted_tensor, entity_tensor)
            permuted_pred = permuted_pred.cpu().numpy()
        
        # Compute importance as increase in error
        baseline_error = np.mean((baseline_pred) ** 2)
        permuted_error = np.mean((permuted_pred - baseline_pred) ** 2)
        
        importance_scores[feature_name] = float(permuted_error)
    
    # Normalize
    total = sum(importance_scores.values()) + 1e-8
    importance_scores = {k: v / total for k, v in importance_scores.items()}
    
    return importance_scores
