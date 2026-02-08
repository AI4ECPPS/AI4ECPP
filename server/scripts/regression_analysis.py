#!/usr/bin/env python3
"""
Regression Analysis Script for Policy Analyst AI
This script performs OLS regression analysis and generates results, plots, and interpretations.
"""

import sys
import json
import base64
import io
import warnings
warnings.filterwarnings('ignore')

import pandas as pd
import numpy as np
import statsmodels.api as sm
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns

def perform_regression(data_json, dependent_var, independent_vars, language='Python'):
    """
    Perform OLS regression analysis.
    
    Args:
        data_json: JSON string of the CSV data
        dependent_var: Name of the dependent variable
        independent_vars: List of independent variable names
        language: 'Python' or 'R' for code generation
    
    Returns:
        Dictionary with results, code, plots, and interpretation
    """
    try:
        # Parse data
        df = pd.read_csv(io.StringIO(data_json))
        
        # Clean column names (remove whitespace)
        df.columns = df.columns.str.strip()
        
        # Check if variables exist
        all_vars = [dependent_var] + independent_vars
        missing_vars = [v for v in all_vars if v not in df.columns]
        if missing_vars:
            return {
                'error': f"Variables not found in data: {', '.join(missing_vars)}",
                'available_columns': list(df.columns)
            }
        
        # Prepare data for regression
        y = df[dependent_var]
        X = df[independent_vars]
        
        # Convert to numeric, coercing errors
        y = pd.to_numeric(y, errors='coerce')
        X = X.apply(pd.to_numeric, errors='coerce')
        
        # Remove rows with missing values
        combined = pd.concat([y, X], axis=1).dropna()
        n_dropped = len(df) - len(combined)
        
        if len(combined) < len(independent_vars) + 2:
            return {
                'error': f"Not enough observations after removing missing values. Need at least {len(independent_vars) + 2} observations, got {len(combined)}."
            }
        
        y_clean = combined[dependent_var]
        X_clean = combined[independent_vars]
        
        # Add constant for intercept
        X_with_const = sm.add_constant(X_clean)
        
        # Fit OLS model
        model = sm.OLS(y_clean, X_with_const)
        results = model.fit()
        
        # Extract coefficients
        coefficients = []
        for i, var in enumerate(X_with_const.columns):
            coef = {
                'variable': var if var != 'const' else '(Intercept)',
                'estimate': float(results.params.iloc[i]),
                'stdError': float(results.bse.iloc[i]),
                'tValue': float(results.tvalues.iloc[i]),
                'pValue': float(results.pvalues.iloc[i])
            }
            coefficients.append(coef)
        
        # Model statistics
        regression_results = {
            'coefficients': coefficients,
            'rSquared': float(results.rsquared),
            'adjRSquared': float(results.rsquared_adj),
            'fStatistic': float(results.fvalue),
            'fPValue': float(results.f_pvalue),
            'nObs': int(results.nobs),
            'droppedObs': n_dropped
        }
        
        # Generate plots
        plots = generate_plots(results, y_clean, X_clean, dependent_var)
        
        # Generate code
        code = generate_code(dependent_var, independent_vars, language)
        
        # Generate interpretation
        interpretation = generate_interpretation(results, dependent_var, independent_vars, coefficients)
        
        return {
            'results': regression_results,
            'code': code,
            'plots': plots,
            'interpretation': interpretation
        }
        
    except Exception as e:
        return {
            'error': str(e)
        }

def generate_plots(results, y, X, dependent_var):
    """Generate diagnostic plots for regression analysis."""
    plots = []
    
    try:
        # Set style
        plt.style.use('seaborn-v0_8-whitegrid')
        
        # 1. Residuals vs Fitted plot
        fig, ax = plt.subplots(figsize=(8, 6))
        fitted = results.fittedvalues
        residuals = results.resid
        ax.scatter(fitted, residuals, alpha=0.6, edgecolors='black', linewidth=0.5)
        ax.axhline(y=0, color='red', linestyle='--', linewidth=1)
        ax.set_xlabel('Fitted Values', fontsize=12)
        ax.set_ylabel('Residuals', fontsize=12)
        ax.set_title('Residuals vs Fitted Values', fontsize=14)
        
        # Add lowess line
        try:
            from statsmodels.nonparametric.smoothers_lowess import lowess
            smoothed = lowess(residuals, fitted, frac=0.6)
            ax.plot(smoothed[:, 0], smoothed[:, 1], color='blue', linewidth=2)
        except:
            pass
        
        plt.tight_layout()
        plots.append({
            'image': fig_to_base64(fig),
            'title': 'Residuals vs Fitted Values'
        })
        plt.close(fig)
        
        # 2. Q-Q plot for normality
        fig, ax = plt.subplots(figsize=(8, 6))
        sm.qqplot(residuals, line='45', ax=ax, markerfacecolor='steelblue', alpha=0.6)
        ax.set_title('Normal Q-Q Plot of Residuals', fontsize=14)
        plt.tight_layout()
        plots.append({
            'image': fig_to_base64(fig),
            'title': 'Normal Q-Q Plot'
        })
        plt.close(fig)
        
        # 3. Histogram of residuals
        fig, ax = plt.subplots(figsize=(8, 6))
        ax.hist(residuals, bins=30, edgecolor='black', alpha=0.7, color='steelblue')
        ax.axvline(x=0, color='red', linestyle='--', linewidth=2)
        ax.set_xlabel('Residuals', fontsize=12)
        ax.set_ylabel('Frequency', fontsize=12)
        ax.set_title('Distribution of Residuals', fontsize=14)
        plt.tight_layout()
        plots.append({
            'image': fig_to_base64(fig),
            'title': 'Histogram of Residuals'
        })
        plt.close(fig)
        
        # 4. Actual vs Predicted
        fig, ax = plt.subplots(figsize=(8, 6))
        ax.scatter(y, fitted, alpha=0.6, edgecolors='black', linewidth=0.5)
        min_val = min(y.min(), fitted.min())
        max_val = max(y.max(), fitted.max())
        ax.plot([min_val, max_val], [min_val, max_val], 'r--', linewidth=2, label='Perfect Fit')
        ax.set_xlabel(f'Actual {dependent_var}', fontsize=12)
        ax.set_ylabel(f'Predicted {dependent_var}', fontsize=12)
        ax.set_title('Actual vs Predicted Values', fontsize=14)
        ax.legend()
        plt.tight_layout()
        plots.append({
            'image': fig_to_base64(fig),
            'title': 'Actual vs Predicted'
        })
        plt.close(fig)
        
    except Exception as e:
        print(f"Warning: Could not generate some plots: {e}", file=sys.stderr)
    
    return plots

def fig_to_base64(fig):
    """Convert matplotlib figure to base64 string."""
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='white')
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode('utf-8')

def generate_code(dependent_var, independent_vars, language):
    """Generate reproducible code for the analysis."""
    
    if language == 'Python':
        code = f'''# Python Regression Analysis Code
# Required packages: pandas, statsmodels, matplotlib, seaborn

import pandas as pd
import statsmodels.api as sm
import matplotlib.pyplot as plt
import seaborn as sns

# Load your data
df = pd.read_csv('your_data.csv')

# Define variables
dependent_var = '{dependent_var}'
independent_vars = {independent_vars}

# Prepare data
y = df[dependent_var]
X = df[independent_vars]

# Add constant for intercept
X = sm.add_constant(X)

# Fit OLS model
model = sm.OLS(y, X)
results = model.fit()

# Print summary
print(results.summary())

# Diagnostic plots
fig, axes = plt.subplots(2, 2, figsize=(12, 10))

# 1. Residuals vs Fitted
axes[0, 0].scatter(results.fittedvalues, results.resid, alpha=0.6)
axes[0, 0].axhline(y=0, color='red', linestyle='--')
axes[0, 0].set_xlabel('Fitted Values')
axes[0, 0].set_ylabel('Residuals')
axes[0, 0].set_title('Residuals vs Fitted')

# 2. Q-Q Plot
sm.qqplot(results.resid, line='45', ax=axes[0, 1])
axes[0, 1].set_title('Normal Q-Q Plot')

# 3. Histogram of Residuals
axes[1, 0].hist(results.resid, bins=30, edgecolor='black', alpha=0.7)
axes[1, 0].set_xlabel('Residuals')
axes[1, 0].set_title('Distribution of Residuals')

# 4. Actual vs Predicted
axes[1, 1].scatter(y, results.fittedvalues, alpha=0.6)
axes[1, 1].plot([y.min(), y.max()], [y.min(), y.max()], 'r--')
axes[1, 1].set_xlabel('Actual')
axes[1, 1].set_ylabel('Predicted')
axes[1, 1].set_title('Actual vs Predicted')

plt.tight_layout()
plt.show()

# Get coefficients as DataFrame
coef_df = pd.DataFrame({{
    'Variable': results.params.index,
    'Coefficient': results.params.values,
    'Std Error': results.bse.values,
    't-value': results.tvalues.values,
    'p-value': results.pvalues.values
}})
print(coef_df)
'''
    else:  # R
        ind_vars_r = ', '.join([f'"{v}"' for v in independent_vars])
        formula = f'{dependent_var} ~ {" + ".join(independent_vars)}'
        code = f'''# R Regression Analysis Code
# Required packages: stats (base R)

# Load your data
df <- read.csv('your_data.csv')

# Define the regression formula
formula <- {dependent_var} ~ {' + '.join(independent_vars)}

# Fit OLS model
model <- lm(formula, data = df)

# Print summary
summary(model)

# Get coefficients
coef_table <- summary(model)$coefficients
print(coef_table)

# Model diagnostics
cat("\\nR-squared:", summary(model)$r.squared)
cat("\\nAdjusted R-squared:", summary(model)$adj.r.squared)
cat("\\nF-statistic:", summary(model)$fstatistic[1])

# Diagnostic plots
par(mfrow = c(2, 2))
plot(model)

# Alternative: Individual plots
par(mfrow = c(2, 2))

# 1. Residuals vs Fitted
plot(fitted(model), residuals(model),
     xlab = "Fitted Values", ylab = "Residuals",
     main = "Residuals vs Fitted")
abline(h = 0, col = "red", lty = 2)

# 2. Q-Q Plot
qqnorm(residuals(model), main = "Normal Q-Q Plot")
qqline(residuals(model), col = "red")

# 3. Histogram of Residuals
hist(residuals(model), breaks = 30,
     xlab = "Residuals", main = "Distribution of Residuals",
     col = "steelblue")

# 4. Actual vs Predicted
plot(df${dependent_var}, fitted(model),
     xlab = "Actual", ylab = "Predicted",
     main = "Actual vs Predicted")
abline(0, 1, col = "red", lty = 2)

# Confidence intervals for coefficients
confint(model)
'''
    
    return code

def generate_interpretation(results, dependent_var, independent_vars, coefficients):
    """Generate plain-English interpretation of the regression results."""
    
    interpretation_parts = []
    
    # Overall model fit
    r_squared = results.rsquared
    adj_r_squared = results.rsquared_adj
    f_pvalue = results.f_pvalue
    
    interpretation_parts.append("## Model Overview\n")
    interpretation_parts.append(f"This regression model examines how {', '.join(independent_vars)} {'affects' if len(independent_vars) == 1 else 'affect'} {dependent_var}.\n")
    
    # Model fit interpretation
    interpretation_parts.append("\n## Model Fit\n")
    if r_squared >= 0.7:
        fit_quality = "strong"
    elif r_squared >= 0.4:
        fit_quality = "moderate"
    else:
        fit_quality = "weak"
    
    interpretation_parts.append(f"The R-squared value of {r_squared:.4f} indicates that the model explains {r_squared*100:.1f}% of the variance in {dependent_var}. This represents a {fit_quality} model fit.\n")
    
    if f_pvalue < 0.05:
        interpretation_parts.append(f"The F-statistic is statistically significant (p = {f_pvalue:.4f}), suggesting that the model as a whole is meaningful and at least one predictor has a significant relationship with the outcome.\n")
    else:
        interpretation_parts.append(f"The F-statistic is not statistically significant (p = {f_pvalue:.4f}), suggesting the model may not be a good fit for the data.\n")
    
    # Coefficient interpretations
    interpretation_parts.append("\n## Coefficient Interpretations\n")
    
    for coef in coefficients:
        var_name = coef['variable']
        estimate = coef['estimate']
        p_value = coef['pValue']
        
        if var_name == '(Intercept)':
            interpretation_parts.append(f"**Intercept**: When all independent variables are zero, the predicted value of {dependent_var} is {estimate:.4f}.\n")
        else:
            # Determine significance
            if p_value < 0.001:
                sig_text = "highly significant (p < 0.001)"
            elif p_value < 0.01:
                sig_text = "very significant (p < 0.01)"
            elif p_value < 0.05:
                sig_text = "statistically significant (p < 0.05)"
            elif p_value < 0.1:
                sig_text = "marginally significant (p < 0.1)"
            else:
                sig_text = "not statistically significant"
            
            # Direction of effect
            if estimate > 0:
                direction = "increases"
            else:
                direction = "decreases"
            
            interpretation_parts.append(f"**{var_name}**: A one-unit increase in {var_name} is associated with a {abs(estimate):.4f} unit {'increase' if estimate > 0 else 'decrease'} in {dependent_var}, holding other variables constant. This effect is {sig_text}.\n")
    
    # Practical implications
    interpretation_parts.append("\n## Key Takeaways\n")
    
    significant_vars = [c for c in coefficients if c['variable'] != '(Intercept)' and c['pValue'] < 0.05]
    if significant_vars:
        var_names = [c['variable'] for c in significant_vars]
        interpretation_parts.append(f"The following variables show statistically significant relationships with {dependent_var}: {', '.join(var_names)}.\n")
    else:
        interpretation_parts.append(f"None of the independent variables show statistically significant relationships with {dependent_var} at the conventional 5% significance level.\n")
    
    # Caveats
    interpretation_parts.append("\n## Caveats\n")
    interpretation_parts.append("- This is a correlational analysis and does not establish causation.\n")
    interpretation_parts.append("- The validity of these results depends on the assumptions of OLS regression being met (linearity, homoskedasticity, normality of residuals, no multicollinearity).\n")
    interpretation_parts.append("- Check the diagnostic plots to assess whether these assumptions hold.\n")
    
    return '\n'.join(interpretation_parts)

def main():
    """Main function to run regression analysis from command line."""
    try:
        # Read input from stdin
        input_data = sys.stdin.read()
        params = json.loads(input_data)
        
        data = params.get('data')
        dependent_var = params.get('dependentVar')
        independent_vars = params.get('independentVars', [])
        language = params.get('language', 'Python')
        
        if not data:
            print(json.dumps({'error': 'No data provided'}))
            sys.exit(1)
        
        if not dependent_var:
            print(json.dumps({'error': 'No dependent variable specified'}))
            sys.exit(1)
        
        if not independent_vars:
            print(json.dumps({'error': 'No independent variables specified'}))
            sys.exit(1)
        
        # Perform regression
        result = perform_regression(data, dependent_var, independent_vars, language)
        
        # Output result as JSON
        print(json.dumps(result))
        
    except json.JSONDecodeError as e:
        print(json.dumps({'error': f'Invalid JSON input: {str(e)}'}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({'error': f'Unexpected error: {str(e)}'}))
        sys.exit(1)

if __name__ == '__main__':
    main()
