#!/usr/bin/env python3
"""
Empirical Analysis Script for Policy Analyst AI
Supports: Descriptive Statistics, OLS Regression, IV/2SLS, Diff-in-Diff, Time Series
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
from scipy import stats
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

def fig_to_base64(fig):
    """Convert matplotlib figure to base64 string."""
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='white')
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode('utf-8')


# ============== DESCRIPTIVE STATISTICS ==============

def perform_descriptive_statistics(df, selected_vars, language='Python'):
    """Perform descriptive statistics analysis."""
    try:
        if not selected_vars:
            selected_vars = df.select_dtypes(include=[np.number]).columns.tolist()
        
        df_analysis = df[selected_vars].apply(pd.to_numeric, errors='coerce')
        
        stats_dict = {
            'count': df_analysis.count().to_dict(),
            'mean': df_analysis.mean().to_dict(),
            'std': df_analysis.std().to_dict(),
            'min': df_analysis.min().to_dict(),
            '25%': df_analysis.quantile(0.25).to_dict(),
            '50%': df_analysis.median().to_dict(),
            '75%': df_analysis.quantile(0.75).to_dict(),
            'max': df_analysis.max().to_dict(),
            'skewness': df_analysis.skew().to_dict(),
            'kurtosis': df_analysis.kurtosis().to_dict(),
            'missing': df_analysis.isnull().sum().to_dict()
        }
        
        results = {
            'variables': selected_vars,
            'statistics': stats_dict,
            'nObs': int(len(df))
        }
        
        plots = generate_descriptive_plots(df_analysis, selected_vars)
        code = generate_descriptive_code(selected_vars, language)
        interpretation = generate_descriptive_interpretation(df_analysis, selected_vars, stats_dict)
        
        return {
            'results': results,
            'code': code,
            'plots': plots,
            'interpretation': interpretation,
            'analysisType': 'descriptive'
        }
    except Exception as e:
        return {'error': str(e)}

def generate_descriptive_plots(df, variables):
    plots = []
    plt.style.use('seaborn-v0_8-whitegrid')
    
    try:
        n_vars = len(variables)
        n_cols = min(3, n_vars)
        n_rows = (n_vars + n_cols - 1) // n_cols
        
        fig, axes = plt.subplots(n_rows, n_cols, figsize=(4*n_cols, 3*n_rows))
        if n_vars == 1:
            axes = [axes]
        else:
            axes = axes.flatten() if n_vars > 1 else [axes]
        
        for i, var in enumerate(variables):
            if i < len(axes):
                data = df[var].dropna()
                axes[i].hist(data, bins=30, edgecolor='black', alpha=0.7, color='steelblue', density=True)
                try:
                    data.plot.kde(ax=axes[i], color='red', linewidth=2)
                except:
                    pass
                axes[i].set_xlabel(var)
                axes[i].set_title(f'Distribution of {var}')
        
        for i in range(n_vars, len(axes)):
            axes[i].set_visible(False)
        
        plt.tight_layout()
        plots.append({'image': fig_to_base64(fig), 'title': 'Distribution Histograms'})
        plt.close(fig)
        
        fig, ax = plt.subplots(figsize=(max(8, len(variables)*1.5), 6))
        df[variables].boxplot(ax=ax)
        ax.set_title('Box Plots of Variables')
        plt.xticks(rotation=45, ha='right')
        plt.tight_layout()
        plots.append({'image': fig_to_base64(fig), 'title': 'Box Plots'})
        plt.close(fig)
        
    except Exception as e:
        print(f"Plot error: {e}", file=sys.stderr)
    
    return plots

def generate_descriptive_code(variables, language):
    vars_str = str(variables)
    if language == 'Python':
        return f'''# Descriptive Statistics (Python)
import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv('your_data.csv')
variables = {vars_str}

# Summary statistics
print(df[variables].describe())
print("\\nSkewness:", df[variables].skew())
print("Kurtosis:", df[variables].kurtosis())

# Histograms
df[variables].hist(bins=30, figsize=(12, 8))
plt.tight_layout()
plt.show()
'''
    else:
        return f'''# Descriptive Statistics (R)
df <- read.csv('your_data.csv')
variables <- c({', '.join([f'"{v}"' for v in variables])})

summary(df[variables])
sapply(df[variables], function(x) c(skewness=moments::skewness(x), kurtosis=moments::kurtosis(x)))

par(mfrow=c(2,2))
for(v in variables) hist(df[[v]], main=v, col="steelblue")
'''

def generate_descriptive_interpretation(df, variables, stats_dict):
    parts = ["## Descriptive Statistics Summary\n"]
    parts.append(f"Analysis of {len(variables)} variable(s) with {int(stats_dict['count'][variables[0]])} observations.\n")
    
    for var in variables:
        mean = stats_dict['mean'].get(var, 0)
        std = stats_dict['std'].get(var, 0)
        skew = stats_dict['skewness'].get(var, 0)
        
        skew_text = "symmetric" if abs(skew) < 0.5 else ("right-skewed" if skew > 0 else "left-skewed")
        parts.append(f"\n**{var}**: Mean={mean:.4f}, SD={std:.4f}, {skew_text} (skew={skew:.2f})")
    
    return '\n'.join(parts)


# ============== OLS REGRESSION ==============

def perform_regression(df, dependent_var, independent_vars, language='Python'):
    """Perform OLS regression analysis."""
    try:
        all_vars = [dependent_var] + independent_vars
        df_clean = df[all_vars].apply(pd.to_numeric, errors='coerce').dropna()
        
        if len(df_clean) < len(independent_vars) + 2:
            return {'error': 'Not enough observations after removing missing values.'}
        
        y = df_clean[dependent_var]
        X = sm.add_constant(df_clean[independent_vars])
        
        model = sm.OLS(y, X).fit()
        
        coefficients = []
        for i, var in enumerate(X.columns):
            coefficients.append({
                'variable': var if var != 'const' else '(Intercept)',
                'estimate': float(model.params.iloc[i]),
                'stdError': float(model.bse.iloc[i]),
                'tValue': float(model.tvalues.iloc[i]),
                'pValue': float(model.pvalues.iloc[i])
            })
        
        results = {
            'coefficients': coefficients,
            'rSquared': float(model.rsquared),
            'adjRSquared': float(model.rsquared_adj),
            'fStatistic': float(model.fvalue),
            'nObs': int(model.nobs)
        }
        
        plots = generate_regression_plots(model, y, dependent_var)
        code = generate_regression_code(dependent_var, independent_vars, language)
        interpretation = generate_regression_interpretation(model, dependent_var, coefficients)
        
        return {
            'results': results,
            'code': code,
            'plots': plots,
            'interpretation': interpretation,
            'analysisType': 'regression'
        }
    except Exception as e:
        return {'error': str(e)}

def generate_regression_plots(model, y, dep_var):
    plots = []
    plt.style.use('seaborn-v0_8-whitegrid')
    
    try:
        fig, axes = plt.subplots(2, 2, figsize=(12, 10))
        
        # Residuals vs Fitted
        axes[0, 0].scatter(model.fittedvalues, model.resid, alpha=0.6)
        axes[0, 0].axhline(y=0, color='red', linestyle='--')
        axes[0, 0].set_xlabel('Fitted Values')
        axes[0, 0].set_ylabel('Residuals')
        axes[0, 0].set_title('Residuals vs Fitted')
        
        # Q-Q Plot
        sm.qqplot(model.resid, line='45', ax=axes[0, 1])
        axes[0, 1].set_title('Normal Q-Q Plot')
        
        # Histogram
        axes[1, 0].hist(model.resid, bins=30, edgecolor='black', alpha=0.7)
        axes[1, 0].set_title('Residual Distribution')
        
        # Actual vs Predicted
        axes[1, 1].scatter(y, model.fittedvalues, alpha=0.6)
        axes[1, 1].plot([y.min(), y.max()], [y.min(), y.max()], 'r--')
        axes[1, 1].set_xlabel('Actual')
        axes[1, 1].set_ylabel('Predicted')
        axes[1, 1].set_title('Actual vs Predicted')
        
        plt.tight_layout()
        plots.append({'image': fig_to_base64(fig), 'title': 'Diagnostic Plots'})
        plt.close(fig)
    except Exception as e:
        print(f"Plot error: {e}", file=sys.stderr)
    
    return plots

def generate_regression_code(dep_var, ind_vars, language):
    if language == 'Python':
        return f'''# OLS Regression (Python)
import pandas as pd
import statsmodels.api as sm

df = pd.read_csv('your_data.csv')
y = df['{dep_var}']
X = sm.add_constant(df[{ind_vars}])

model = sm.OLS(y, X).fit()
print(model.summary())
'''
    else:
        return f'''# OLS Regression (R)
df <- read.csv('your_data.csv')
model <- lm({dep_var} ~ {' + '.join(ind_vars)}, data=df)
summary(model)
'''

def generate_regression_interpretation(model, dep_var, coefficients):
    r2 = model.rsquared
    fit = "strong" if r2 >= 0.7 else "moderate" if r2 >= 0.4 else "weak"
    
    parts = [f"## OLS Regression Results\n"]
    parts.append(f"R² = {r2:.4f} ({fit} fit, explains {r2*100:.1f}% of variance)\n")
    
    parts.append("\n## Coefficients:\n")
    for c in coefficients:
        sig = "***" if c['pValue'] < 0.001 else "**" if c['pValue'] < 0.01 else "*" if c['pValue'] < 0.05 else ""
        parts.append(f"- {c['variable']}: {c['estimate']:.4f} {sig}")
    
    return '\n'.join(parts)


# ============== LOGIT ==============

def perform_logit(df, dependent_var, independent_vars, language='Python'):
    """Perform Logit regression for binary outcomes."""
    try:
        all_vars = [dependent_var] + independent_vars
        df_clean = df[all_vars].apply(pd.to_numeric, errors='coerce').dropna()
        
        if len(df_clean) < len(independent_vars) + 10:
            return {'error': 'Not enough observations for logit regression.'}
        
        y = df_clean[dependent_var]
        
        # Check if y is binary
        unique_vals = y.unique()
        if len(unique_vals) > 2:
            return {'error': f'Dependent variable must be binary (0/1). Found {len(unique_vals)} unique values.'}
        
        X = sm.add_constant(df_clean[independent_vars])
        
        model = sm.Logit(y, X).fit(disp=0)
        
        # Calculate marginal effects at means
        marginal_effects = model.get_margeff(at='mean')
        
        coefficients = []
        for i, var in enumerate(X.columns):
            me = marginal_effects.margeff[i-1] if i > 0 else None  # No marginal effect for constant
            coefficients.append({
                'variable': var if var != 'const' else '(Intercept)',
                'estimate': float(model.params.iloc[i]),
                'stdError': float(model.bse.iloc[i]),
                'zValue': float(model.tvalues.iloc[i]),
                'pValue': float(model.pvalues.iloc[i]),
                'oddsRatio': float(np.exp(model.params.iloc[i])) if var != 'const' else None,
                'marginalEffect': float(me) if me is not None else None
            })
        
        # Predicted probabilities
        y_pred_prob = model.predict(X)
        y_pred = (y_pred_prob >= 0.5).astype(int)
        
        # Confusion matrix
        from sklearn.metrics import confusion_matrix, accuracy_score, precision_score, recall_score
        cm = confusion_matrix(y, y_pred)
        accuracy = accuracy_score(y, y_pred)
        
        results = {
            'coefficients': coefficients,
            'pseudoRSquared': float(model.prsquared),
            'logLikelihood': float(model.llf),
            'aic': float(model.aic),
            'bic': float(model.bic),
            'nObs': int(model.nobs),
            'accuracy': float(accuracy),
            'confusionMatrix': cm.tolist()
        }
        
        plots = generate_logit_probit_plots(model, y, y_pred_prob, 'Logit')
        code = generate_logit_code(dependent_var, independent_vars, language)
        interpretation = generate_logit_interpretation(results, dependent_var, coefficients)
        
        return {
            'results': results,
            'code': code,
            'plots': plots,
            'interpretation': interpretation,
            'analysisType': 'logit'
        }
    except Exception as e:
        import traceback
        return {'error': f'{str(e)}\n{traceback.format_exc()}'}

def generate_logit_code(dependent_var, independent_vars, language):
    vars_str = str(independent_vars)
    if language == 'Python':
        return f'''# Logit Regression (Python)
import pandas as pd
import statsmodels.api as sm

df = pd.read_csv('your_data.csv')

y = df['{dependent_var}']
X = sm.add_constant(df[{vars_str}])

model = sm.Logit(y, X).fit()
print(model.summary())

# Marginal Effects
print("\\nMarginal Effects (at mean):")
print(model.get_margeff(at='mean').summary())

# Odds Ratios
import numpy as np
print("\\nOdds Ratios:")
print(np.exp(model.params))
'''
    else:
        vars_r = ' + '.join(independent_vars)
        return f'''# Logit Regression (R)
library(margins)

df <- read.csv('your_data.csv')

model <- glm({dependent_var} ~ {vars_r}, data=df, family=binomial(link="logit"))
summary(model)

# Odds Ratios
exp(coef(model))

# Marginal Effects
margins(model)
'''

def generate_logit_interpretation(results, dependent_var, coefficients):
    parts = ["## Logit Regression Results\n"]
    parts.append(f"**Model Fit:**")
    parts.append(f"- Pseudo R-squared: {results['pseudoRSquared']:.4f}")
    parts.append(f"- Log-Likelihood: {results['logLikelihood']:.2f}")
    parts.append(f"- AIC: {results['aic']:.2f}, BIC: {results['bic']:.2f}")
    parts.append(f"- Prediction Accuracy: {results['accuracy']*100:.1f}%\n")
    
    parts.append("\n## Coefficients (Log-Odds):\n")
    for c in coefficients:
        if c['variable'] == '(Intercept)':
            continue
        sig = "***" if c['pValue'] < 0.001 else "**" if c['pValue'] < 0.01 else "*" if c['pValue'] < 0.05 else ""
        or_val = c.get('oddsRatio')
        me_val = c.get('marginalEffect')
        or_str = f", OR={or_val:.3f}" if or_val else ""
        me_str = f", ME={me_val:.4f}" if me_val else ""
        parts.append(f"- {c['variable']}: {c['estimate']:.4f} {sig}{or_str}{me_str}")
    
    parts.append("\n\n**Interpretation:**")
    parts.append("- Coefficients are in log-odds. Odds Ratio (OR) = exp(coef).")
    parts.append("- OR > 1 means higher odds of Y=1 as X increases.")
    parts.append("- Marginal Effect (ME) shows probability change for 1-unit X increase.")
    
    return '\n'.join(parts)


# ============== PROBIT ==============

def perform_probit(df, dependent_var, independent_vars, language='Python'):
    """Perform Probit regression for binary outcomes."""
    try:
        all_vars = [dependent_var] + independent_vars
        df_clean = df[all_vars].apply(pd.to_numeric, errors='coerce').dropna()
        
        if len(df_clean) < len(independent_vars) + 10:
            return {'error': 'Not enough observations for probit regression.'}
        
        y = df_clean[dependent_var]
        
        # Check if y is binary
        unique_vals = y.unique()
        if len(unique_vals) > 2:
            return {'error': f'Dependent variable must be binary (0/1). Found {len(unique_vals)} unique values.'}
        
        X = sm.add_constant(df_clean[independent_vars])
        
        model = sm.Probit(y, X).fit(disp=0)
        
        # Calculate marginal effects at means
        marginal_effects = model.get_margeff(at='mean')
        
        coefficients = []
        for i, var in enumerate(X.columns):
            me = marginal_effects.margeff[i-1] if i > 0 else None
            coefficients.append({
                'variable': var if var != 'const' else '(Intercept)',
                'estimate': float(model.params.iloc[i]),
                'stdError': float(model.bse.iloc[i]),
                'zValue': float(model.tvalues.iloc[i]),
                'pValue': float(model.pvalues.iloc[i]),
                'marginalEffect': float(me) if me is not None else None
            })
        
        # Predicted probabilities
        y_pred_prob = model.predict(X)
        y_pred = (y_pred_prob >= 0.5).astype(int)
        
        # Confusion matrix
        from sklearn.metrics import confusion_matrix, accuracy_score
        cm = confusion_matrix(y, y_pred)
        accuracy = accuracy_score(y, y_pred)
        
        results = {
            'coefficients': coefficients,
            'pseudoRSquared': float(model.prsquared),
            'logLikelihood': float(model.llf),
            'aic': float(model.aic),
            'bic': float(model.bic),
            'nObs': int(model.nobs),
            'accuracy': float(accuracy),
            'confusionMatrix': cm.tolist()
        }
        
        plots = generate_logit_probit_plots(model, y, y_pred_prob, 'Probit')
        code = generate_probit_code(dependent_var, independent_vars, language)
        interpretation = generate_probit_interpretation(results, dependent_var, coefficients)
        
        return {
            'results': results,
            'code': code,
            'plots': plots,
            'interpretation': interpretation,
            'analysisType': 'probit'
        }
    except Exception as e:
        import traceback
        return {'error': f'{str(e)}\n{traceback.format_exc()}'}

def generate_logit_probit_plots(model, y, y_pred_prob, model_type):
    """Generate diagnostic plots for Logit/Probit models."""
    plots = []
    plt.style.use('seaborn-v0_8-whitegrid')
    
    try:
        fig, axes = plt.subplots(2, 2, figsize=(12, 10))
        
        # ROC curve
        from sklearn.metrics import roc_curve, auc
        fpr, tpr, _ = roc_curve(y, y_pred_prob)
        roc_auc = auc(fpr, tpr)
        axes[0, 0].plot(fpr, tpr, 'b-', lw=2, label=f'ROC (AUC = {roc_auc:.3f})')
        axes[0, 0].plot([0, 1], [0, 1], 'r--', lw=1)
        axes[0, 0].set_xlabel('False Positive Rate')
        axes[0, 0].set_ylabel('True Positive Rate')
        axes[0, 0].set_title(f'{model_type} ROC Curve')
        axes[0, 0].legend(loc='lower right')
        
        # Predicted probability distribution by outcome
        y_arr = np.array(y)
        axes[0, 1].hist(y_pred_prob[y_arr == 0], bins=20, alpha=0.5, label='Y=0', color='red')
        axes[0, 1].hist(y_pred_prob[y_arr == 1], bins=20, alpha=0.5, label='Y=1', color='blue')
        axes[0, 1].set_xlabel('Predicted Probability')
        axes[0, 1].set_ylabel('Frequency')
        axes[0, 1].set_title('Predicted Probabilities by Outcome')
        axes[0, 1].legend()
        
        # Confusion matrix heatmap
        from sklearn.metrics import confusion_matrix
        y_pred = (y_pred_prob >= 0.5).astype(int)
        cm = confusion_matrix(y, y_pred)
        im = axes[1, 0].imshow(cm, interpolation='nearest', cmap='Blues')
        axes[1, 0].set_xlabel('Predicted')
        axes[1, 0].set_ylabel('Actual')
        axes[1, 0].set_title('Confusion Matrix')
        axes[1, 0].set_xticks([0, 1])
        axes[1, 0].set_yticks([0, 1])
        for i in range(2):
            for j in range(2):
                axes[1, 0].text(j, i, str(cm[i, j]), ha='center', va='center', fontsize=16, 
                              color='white' if cm[i, j] > cm.max()/2 else 'black')
        
        # Coefficients bar chart
        coef_names = [f'X{i}' for i in range(len(model.params)-1)]
        coef_vals = model.params.values[1:]  # Skip intercept
        colors = ['green' if v > 0 else 'red' for v in coef_vals]
        axes[1, 1].barh(range(len(coef_vals)), coef_vals, color=colors, alpha=0.7)
        axes[1, 1].set_yticks(range(len(coef_vals)))
        axes[1, 1].set_yticklabels(coef_names)
        axes[1, 1].axvline(x=0, color='black', linestyle='-', lw=1)
        axes[1, 1].set_xlabel('Coefficient')
        axes[1, 1].set_title('Coefficient Magnitudes')
        
        plt.tight_layout()
        plots.append({'image': fig_to_base64(fig), 'title': f'{model_type} Diagnostics'})
        plt.close(fig)
    except Exception as e:
        print(f"Plot error: {e}", file=sys.stderr)
    
    return plots

def generate_probit_code(dependent_var, independent_vars, language):
    vars_str = str(independent_vars)
    if language == 'Python':
        return f'''# Probit Regression (Python)
import pandas as pd
import statsmodels.api as sm

df = pd.read_csv('your_data.csv')

y = df['{dependent_var}']
X = sm.add_constant(df[{vars_str}])

model = sm.Probit(y, X).fit()
print(model.summary())

# Marginal Effects
print("\\nMarginal Effects (at mean):")
print(model.get_margeff(at='mean').summary())
'''
    else:
        vars_r = ' + '.join(independent_vars)
        return f'''# Probit Regression (R)
library(margins)

df <- read.csv('your_data.csv')

model <- glm({dependent_var} ~ {vars_r}, data=df, family=binomial(link="probit"))
summary(model)

# Marginal Effects
margins(model)
'''

def generate_probit_interpretation(results, dependent_var, coefficients):
    parts = ["## Probit Regression Results\n"]
    parts.append(f"**Model Fit:**")
    parts.append(f"- Pseudo R-squared: {results['pseudoRSquared']:.4f}")
    parts.append(f"- Log-Likelihood: {results['logLikelihood']:.2f}")
    parts.append(f"- AIC: {results['aic']:.2f}, BIC: {results['bic']:.2f}")
    parts.append(f"- Prediction Accuracy: {results['accuracy']*100:.1f}%\n")
    
    parts.append("\n## Coefficients:\n")
    for c in coefficients:
        if c['variable'] == '(Intercept)':
            continue
        sig = "***" if c['pValue'] < 0.001 else "**" if c['pValue'] < 0.01 else "*" if c['pValue'] < 0.05 else ""
        me_val = c.get('marginalEffect')
        me_str = f", ME={me_val:.4f}" if me_val else ""
        parts.append(f"- {c['variable']}: {c['estimate']:.4f} {sig}{me_str}")
    
    parts.append("\n\n**Interpretation:**")
    parts.append("- Probit coefficients don't have direct interpretation like logit.")
    parts.append("- Marginal Effects (ME) show the change in P(Y=1) for 1-unit X increase.")
    parts.append("- Positive coefficient = higher probability of Y=1.")
    
    return '\n'.join(parts)


# ============== IV / 2SLS ==============

def perform_iv_regression(df, dependent_var, endogenous_var, instrument_vars, exogenous_vars=None, language='Python'):
    """Perform IV/2SLS regression using manual implementation with statsmodels."""
    try:
        all_vars = [dependent_var, endogenous_var] + instrument_vars + (exogenous_vars or [])
        df_clean = df[all_vars].apply(pd.to_numeric, errors='coerce').dropna()
        
        if len(df_clean) < 10:
            return {'error': 'Not enough observations for IV regression.'}
        
        y = df_clean[dependent_var].values
        endog = df_clean[endogenous_var].values
        Z = df_clean[instrument_vars].values  # Instruments
        
        # Build exogenous regressors (controls + constant)
        if exogenous_vars and len(exogenous_vars) > 0:
            W = sm.add_constant(df_clean[exogenous_vars]).values  # Exogenous controls
        else:
            W = np.ones((len(df_clean), 1))  # Just constant
        
        n = len(y)
        
        # ===== FIRST STAGE =====
        # Regress endogenous variable on instruments and exogenous controls
        # X = [W, Z] (all first-stage regressors)
        first_stage_X = np.column_stack([W, Z])
        first_stage_model = sm.OLS(endog, first_stage_X).fit()
        endog_hat = first_stage_model.fittedvalues  # Predicted values of endogenous var
        
        # First stage F-statistic (for instruments only)
        # Compare model with instruments vs model without instruments
        restricted_model = sm.OLS(endog, W).fit()
        
        # F-test for joint significance of instruments
        ssr_restricted = restricted_model.ssr
        ssr_unrestricted = first_stage_model.ssr
        df_diff = len(instrument_vars)  # Number of instruments
        df_resid = n - first_stage_X.shape[1]
        
        first_stage_f = ((ssr_restricted - ssr_unrestricted) / df_diff) / (ssr_unrestricted / df_resid)
        
        # ===== SECOND STAGE =====
        # Regress Y on predicted endogenous variable and exogenous controls
        # Use fitted values from first stage
        second_stage_X = np.column_stack([W, endog_hat])
        second_stage_model = sm.OLS(y, second_stage_X).fit()
        
        # ===== CORRECT STANDARD ERRORS =====
        # The standard errors from the second stage are incorrect because we used
        # predicted values. We need to correct them.
        # 
        # Correct formula: Var(β) = σ² * (X'PzX)^(-1)
        # where Pz = Z(Z'Z)^(-1)Z' is the projection matrix
        
        # Residuals using ORIGINAL endogenous variable (not fitted)
        second_stage_X_original = np.column_stack([W, endog])
        beta_2sls = second_stage_model.params
        residuals = y - second_stage_X_original @ beta_2sls
        sigma2 = np.sum(residuals**2) / (n - second_stage_X.shape[1])
        
        # Variance-covariance matrix with correct standard errors
        XtX_inv = np.linalg.inv(second_stage_X.T @ second_stage_X)
        var_beta = sigma2 * XtX_inv
        se_corrected = np.sqrt(np.diag(var_beta))
        
        # t-statistics and p-values
        t_stats = beta_2sls / se_corrected
        p_values = 2 * (1 - stats.t.cdf(np.abs(t_stats), df=n - second_stage_X.shape[1]))
        
        # Build coefficient names
        coef_names = []
        if exogenous_vars and len(exogenous_vars) > 0:
            coef_names = ['(Intercept)'] + exogenous_vars + [endogenous_var]
        else:
            coef_names = ['(Intercept)', endogenous_var]
        
        coefficients = []
        for i, var in enumerate(coef_names):
            coefficients.append({
                'variable': var,
                'estimate': float(beta_2sls[i]),
                'stdError': float(se_corrected[i]),
                'zValue': float(t_stats[i]),
                'pValue': float(p_values[i])
            })
        
        # R-squared (using original endogenous variable)
        ss_res = np.sum(residuals**2)
        ss_tot = np.sum((y - np.mean(y))**2)
        r_squared = 1 - ss_res / ss_tot
        
        results = {
            'coefficients': coefficients,
            'nObs': int(n),
            'rSquared': float(r_squared),
            'firstStageF': float(first_stage_f),
            'weakInstrumentTest': True,
            'firstStageCoefs': {
                'instruments': instrument_vars,
                'fStatistic': float(first_stage_f),
                'fPValue': float(1 - stats.f.cdf(first_stage_f, df_diff, df_resid))
            }
        }
        
        plots = generate_iv_plots_manual(y, endog, endog_hat, residuals, df_clean, endogenous_var, instrument_vars)
        code = generate_iv_code(dependent_var, endogenous_var, instrument_vars, exogenous_vars, language)
        interpretation = generate_iv_interpretation(results, dependent_var, endogenous_var, instrument_vars)
        
        return {
            'results': results,
            'code': code,
            'plots': plots,
            'interpretation': interpretation,
            'analysisType': 'iv'
        }
    except Exception as e:
        import traceback
        return {'error': f'{str(e)}\n{traceback.format_exc()}'}

def generate_iv_plots_manual(y, endog, endog_hat, residuals, df, endog_var, inst_vars):
    """Generate plots for IV/2SLS regression (manual implementation)."""
    plots = []
    plt.style.use('seaborn-v0_8-whitegrid')
    
    try:
        fig, axes = plt.subplots(2, 2, figsize=(12, 10))
        
        # First stage: instrument vs endogenous
        if len(inst_vars) > 0:
            axes[0, 0].scatter(df[inst_vars[0]], df[endog_var], alpha=0.6, edgecolors='black', linewidth=0.5)
            # Add regression line
            z = np.polyfit(df[inst_vars[0]], df[endog_var], 1)
            p = np.poly1d(z)
            x_line = np.linspace(df[inst_vars[0]].min(), df[inst_vars[0]].max(), 100)
            axes[0, 0].plot(x_line, p(x_line), 'r-', linewidth=2)
            axes[0, 0].set_xlabel(f'Instrument: {inst_vars[0]}')
            axes[0, 0].set_ylabel(f'Endogenous: {endog_var}')
            axes[0, 0].set_title('First Stage: Instrument vs Endogenous')
        
        # First stage fitted vs actual
        axes[0, 1].scatter(endog, endog_hat, alpha=0.6, edgecolors='black', linewidth=0.5)
        min_val, max_val = min(endog.min(), endog_hat.min()), max(endog.max(), endog_hat.max())
        axes[0, 1].plot([min_val, max_val], [min_val, max_val], 'r--', linewidth=2)
        axes[0, 1].set_xlabel(f'Actual {endog_var}')
        axes[0, 1].set_ylabel(f'Predicted {endog_var}')
        axes[0, 1].set_title('First Stage: Actual vs Predicted')
        
        # Second stage residuals vs fitted
        fitted_y = y - residuals
        axes[1, 0].scatter(fitted_y, residuals, alpha=0.6, edgecolors='black', linewidth=0.5)
        axes[1, 0].axhline(y=0, color='red', linestyle='--', linewidth=2)
        axes[1, 0].set_xlabel('Fitted Values (Y)')
        axes[1, 0].set_ylabel('Residuals')
        axes[1, 0].set_title('2SLS Residuals vs Fitted')
        
        # Residuals histogram
        axes[1, 1].hist(residuals, bins=30, edgecolor='black', alpha=0.7, color='steelblue')
        axes[1, 1].axvline(x=0, color='red', linestyle='--', linewidth=2)
        axes[1, 1].set_xlabel('Residuals')
        axes[1, 1].set_ylabel('Frequency')
        axes[1, 1].set_title('Distribution of 2SLS Residuals')
        
        plt.tight_layout()
        plots.append({'image': fig_to_base64(fig), 'title': 'IV/2SLS Diagnostics'})
        plt.close(fig)
    except Exception as e:
        print(f"Plot error: {e}", file=sys.stderr)
    
    return plots

def generate_iv_code(dep_var, endog_var, inst_vars, exog_vars, language):
    if language == 'Python':
        exog_str = f"df[{exog_vars}]" if exog_vars else "None"
        return f'''# IV/2SLS Regression (Python)
from linearmodels.iv import IV2SLS
import pandas as pd
import statsmodels.api as sm

df = pd.read_csv('your_data.csv')

y = df['{dep_var}']
endog = df[['{endog_var}']]
instruments = df[{inst_vars}]
exog = sm.add_constant({exog_str}) if {exog_vars} else None

model = IV2SLS(y, exog, endog, instruments).fit()
print(model.summary)

# First stage F-statistic
first_stage = sm.OLS(df['{endog_var}'], sm.add_constant(instruments)).fit()
print(f"First Stage F: {{first_stage.fvalue:.4f}}")
'''
    else:
        return f'''# IV/2SLS Regression (R)
library(AER)
df <- read.csv('your_data.csv')

model <- ivreg({dep_var} ~ {endog_var} | {' + '.join(inst_vars)}, data=df)
summary(model, diagnostics=TRUE)
'''

def generate_iv_interpretation(results, dep_var, endog_var, inst_vars):
    parts = ["## IV/2SLS Results\n"]
    
    f_stat = results.get('firstStageF', 0)
    weak = "Strong instruments" if f_stat > 10 else "Possibly weak instruments"
    parts.append(f"First Stage F-statistic: {f_stat:.4f} ({weak})\n")
    parts.append("Rule of thumb: F > 10 indicates strong instruments.\n")
    
    parts.append("\n## Coefficients:\n")
    for c in results['coefficients']:
        sig = "***" if c['pValue'] < 0.001 else "**" if c['pValue'] < 0.01 else "*" if c['pValue'] < 0.05 else ""
        parts.append(f"- {c['variable']}: {c['estimate']:.4f} {sig}")
    
    parts.append(f"\n\n## Key Assumption:\nInstrument(s) {inst_vars} affect {dep_var} only through {endog_var}.")
    
    return '\n'.join(parts)


# ============== DIFFERENCE-IN-DIFFERENCES ==============

def perform_did(df, outcome_var, treatment_var, time_var, control_vars=None, language='Python'):
    """Perform Difference-in-Differences analysis."""
    try:
        all_vars = [outcome_var, treatment_var, time_var] + (control_vars or [])
        df_clean = df[all_vars].apply(pd.to_numeric, errors='coerce').dropna()
        
        # Create interaction term
        df_clean['treatment_x_time'] = df_clean[treatment_var] * df_clean[time_var]
        
        # Build regression
        y = df_clean[outcome_var]
        X_vars = [treatment_var, time_var, 'treatment_x_time'] + (control_vars or [])
        X = sm.add_constant(df_clean[X_vars])
        
        model = sm.OLS(y, X).fit()
        
        # Extract DID coefficient
        did_idx = list(X.columns).index('treatment_x_time')
        did_estimate = float(model.params.iloc[did_idx])
        did_se = float(model.bse.iloc[did_idx])
        did_pvalue = float(model.pvalues.iloc[did_idx])
        
        coefficients = []
        for i, var in enumerate(X.columns):
            var_name = var
            if var == 'treatment_x_time':
                var_name = f'{treatment_var} × {time_var} (DID)'
            elif var == 'const':
                var_name = '(Intercept)'
            
            coefficients.append({
                'variable': var_name,
                'estimate': float(model.params.iloc[i]),
                'stdError': float(model.bse.iloc[i]),
                'tValue': float(model.tvalues.iloc[i]),
                'pValue': float(model.pvalues.iloc[i])
            })
        
        # Calculate group means
        group_means = {
            'controlPre': float(df_clean[(df_clean[treatment_var]==0) & (df_clean[time_var]==0)][outcome_var].mean()),
            'controlPost': float(df_clean[(df_clean[treatment_var]==0) & (df_clean[time_var]==1)][outcome_var].mean()),
            'treatmentPre': float(df_clean[(df_clean[treatment_var]==1) & (df_clean[time_var]==0)][outcome_var].mean()),
            'treatmentPost': float(df_clean[(df_clean[treatment_var]==1) & (df_clean[time_var]==1)][outcome_var].mean())
        }
        
        results = {
            'coefficients': coefficients,
            'didEstimate': did_estimate,
            'didStdError': did_se,
            'didPValue': did_pvalue,
            'groupMeans': group_means,
            'rSquared': float(model.rsquared),
            'nObs': int(model.nobs)
        }
        
        plots = generate_did_plots(df_clean, outcome_var, treatment_var, time_var, group_means)
        code = generate_did_code(outcome_var, treatment_var, time_var, control_vars, language)
        interpretation = generate_did_interpretation(results, outcome_var, treatment_var, time_var)
        
        return {
            'results': results,
            'code': code,
            'plots': plots,
            'interpretation': interpretation,
            'analysisType': 'did'
        }
    except Exception as e:
        return {'error': str(e)}

def generate_did_plots(df, outcome_var, treatment_var, time_var, group_means):
    plots = []
    plt.style.use('seaborn-v0_8-whitegrid')
    
    try:
        fig, axes = plt.subplots(1, 2, figsize=(14, 5))
        
        # DID visualization
        x = [0, 1]
        control = [group_means['controlPre'], group_means['controlPost']]
        treatment = [group_means['treatmentPre'], group_means['treatmentPost']]
        
        axes[0].plot(x, control, 'b-o', markersize=10, linewidth=2, label='Control')
        axes[0].plot(x, treatment, 'r-s', markersize=10, linewidth=2, label='Treatment')
        
        # Counterfactual
        counterfactual = group_means['treatmentPre'] + (group_means['controlPost'] - group_means['controlPre'])
        axes[0].plot([0, 1], [group_means['treatmentPre'], counterfactual], 'r--', alpha=0.5, label='Counterfactual')
        
        axes[0].set_xticks([0, 1])
        axes[0].set_xticklabels(['Pre', 'Post'])
        axes[0].set_xlabel('Time Period')
        axes[0].set_ylabel(outcome_var)
        axes[0].set_title('Difference-in-Differences')
        axes[0].legend()
        
        # Box plot by group
        df['Group'] = df.apply(lambda r: f"{'Treat' if r[treatment_var]==1 else 'Ctrl'}-{'Post' if r[time_var]==1 else 'Pre'}", axis=1)
        df.boxplot(column=outcome_var, by='Group', ax=axes[1])
        axes[1].set_title('Outcome by Group')
        plt.suptitle('')
        
        plt.tight_layout()
        plots.append({'image': fig_to_base64(fig), 'title': 'DID Analysis'})
        plt.close(fig)
    except Exception as e:
        print(f"Plot error: {e}", file=sys.stderr)
    
    return plots

def generate_did_code(outcome_var, treatment_var, time_var, control_vars, language):
    controls = f" + {' + '.join(control_vars)}" if control_vars else ""
    if language == 'Python':
        return f'''# Difference-in-Differences (Python)
import pandas as pd
import statsmodels.api as sm

df = pd.read_csv('your_data.csv')

# Create interaction
df['did'] = df['{treatment_var}'] * df['{time_var}']

# DID regression
formula = '{outcome_var} ~ {treatment_var} + {time_var} + did{controls}'
model = sm.OLS.from_formula(formula, data=df).fit()
print(model.summary())

# The DID estimate is the coefficient on 'did'
print(f"DID Estimate: {{model.params['did']:.4f}}")
'''
    else:
        return f'''# Difference-in-Differences (R)
df <- read.csv('your_data.csv')

# DID regression
model <- lm({outcome_var} ~ {treatment_var} * {time_var}{controls}, data=df)
summary(model)

# The DID estimate is the interaction coefficient
'''

def generate_did_interpretation(results, outcome_var, treatment_var, time_var):
    parts = ["## Difference-in-Differences Results\n"]
    
    did = results['didEstimate']
    p = results['didPValue']
    sig = "***" if p < 0.001 else "**" if p < 0.01 else "*" if p < 0.05 else ""
    sig_text = "statistically significant" if p < 0.05 else "not statistically significant"
    
    parts.append(f"### DID Treatment Effect: {did:.4f} {sig}\n")
    parts.append(f"Standard Error: {results['didStdError']:.4f}, p-value: {p:.4f}\n")
    parts.append(f"The effect is {sig_text} at the 5% level.\n")
    
    gm = results['groupMeans']
    parts.append("\n### Group Means:\n")
    parts.append(f"- Control Pre: {gm['controlPre']:.4f}, Control Post: {gm['controlPost']:.4f}")
    parts.append(f"- Treatment Pre: {gm['treatmentPre']:.4f}, Treatment Post: {gm['treatmentPost']:.4f}")
    
    parts.append("\n\n### Key Assumption:\nParallel trends - absent treatment, both groups would have changed similarly.")
    
    return '\n'.join(parts)


# ============== TIME SERIES ==============

def perform_timeseries(df, ts_var, date_var=None, language='Python'):
    """Perform time series analysis."""
    try:
        from statsmodels.tsa.stattools import adfuller, acf, pacf
        
        if date_var and date_var in df.columns:
            df = df.sort_values(date_var)
        
        series = pd.to_numeric(df[ts_var], errors='coerce').dropna()
        
        if len(series) < 10:
            return {'error': 'Time series too short (need at least 10 observations).'}
        
        # ADF test
        adf_result = adfuller(series, autolag='AIC')
        adf_test = {
            'statistic': float(adf_result[0]),
            'pValue': float(adf_result[1]),
            'usedLag': int(adf_result[2]),
            'nObs': int(adf_result[3]),
            'criticalValues': {k: float(v) for k, v in adf_result[4].items()}
        }
        
        # Summary statistics
        summary = {
            'nObs': int(len(series)),
            'mean': float(series.mean()),
            'std': float(series.std()),
            'min': float(series.min()),
            'max': float(series.max()),
            'trend': 'Upward' if series.iloc[-1] > series.iloc[0] else 'Downward'
        }
        
        # Autocorrelation
        acf_values = acf(series, nlags=min(20, len(series)//2))
        autocorrelation = [float(x) for x in acf_values[:10]]
        
        # Try auto ARIMA
        arima_result = None
        try:
            from statsmodels.tsa.arima.model import ARIMA
            # Simple ARIMA(1,1,1)
            model = ARIMA(series, order=(1, 1, 1)).fit()
            arima_result = {
                'order': [1, 1, 1],
                'aic': float(model.aic),
                'bic': float(model.bic)
            }
        except:
            pass
        
        results = {
            'adfTest': adf_test,
            'summary': summary,
            'autocorrelation': autocorrelation,
            'arima': arima_result
        }
        
        plots = generate_timeseries_plots(series, ts_var, adf_test)
        code = generate_timeseries_code(ts_var, date_var, language)
        interpretation = generate_timeseries_interpretation(results, ts_var)
        
        return {
            'results': results,
            'code': code,
            'plots': plots,
            'interpretation': interpretation,
            'analysisType': 'timeseries'
        }
    except Exception as e:
        return {'error': str(e)}

def generate_timeseries_plots(series, ts_var, adf_test):
    plots = []
    plt.style.use('seaborn-v0_8-whitegrid')
    
    try:
        from statsmodels.tsa.stattools import acf, pacf
        from statsmodels.graphics.tsaplots import plot_acf, plot_pacf
        
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        
        # Time series plot
        axes[0, 0].plot(series.values, linewidth=1)
        axes[0, 0].set_title(f'Time Series: {ts_var}')
        axes[0, 0].set_xlabel('Time')
        axes[0, 0].set_ylabel(ts_var)
        
        # Distribution
        axes[0, 1].hist(series, bins=30, edgecolor='black', alpha=0.7)
        axes[0, 1].set_title('Distribution')
        
        # ACF
        plot_acf(series, ax=axes[1, 0], lags=min(20, len(series)//2-1))
        axes[1, 0].set_title('Autocorrelation Function (ACF)')
        
        # PACF
        plot_pacf(series, ax=axes[1, 1], lags=min(20, len(series)//2-1))
        axes[1, 1].set_title('Partial ACF (PACF)')
        
        plt.tight_layout()
        plots.append({'image': fig_to_base64(fig), 'title': 'Time Series Analysis'})
        plt.close(fig)
    except Exception as e:
        print(f"Plot error: {e}", file=sys.stderr)
    
    return plots

def generate_timeseries_code(ts_var, date_var, language):
    if language == 'Python':
        return f'''# Time Series Analysis (Python)
import pandas as pd
from statsmodels.tsa.stattools import adfuller, acf, pacf
from statsmodels.tsa.arima.model import ARIMA
import matplotlib.pyplot as plt

df = pd.read_csv('your_data.csv')
series = df['{ts_var}'].dropna()

# ADF Test for stationarity
adf_result = adfuller(series)
print(f"ADF Statistic: {{adf_result[0]:.4f}}")
print(f"p-value: {{adf_result[1]:.4f}}")
print("Stationary" if adf_result[1] < 0.05 else "Non-stationary")

# Plot
fig, axes = plt.subplots(2, 2, figsize=(12, 8))
axes[0,0].plot(series)
axes[0,0].set_title('Time Series')

from statsmodels.graphics.tsaplots import plot_acf, plot_pacf
plot_acf(series, ax=axes[1,0])
plot_pacf(series, ax=axes[1,1])
plt.tight_layout()
plt.show()

# ARIMA (if non-stationary, use d=1)
model = ARIMA(series, order=(1,1,1)).fit()
print(model.summary())
'''
    else:
        return f'''# Time Series Analysis (R)
library(tseries)
library(forecast)

df <- read.csv('your_data.csv')
series <- ts(df${ts_var})

# ADF Test
adf.test(series)

# ACF/PACF
par(mfrow=c(2,2))
plot(series, main="Time Series")
acf(series, main="ACF")
pacf(series, main="PACF")

# Auto ARIMA
model <- auto.arima(series)
summary(model)
'''

def generate_timeseries_interpretation(results, ts_var):
    parts = [f"## Time Series Analysis: {ts_var}\n"]
    
    adf = results['adfTest']
    stationary = adf['pValue'] < 0.05
    
    parts.append("### Stationarity (ADF Test):\n")
    parts.append(f"ADF Statistic: {adf['statistic']:.4f}, p-value: {adf['pValue']:.4f}\n")
    parts.append(f"**Conclusion**: {'Stationary (reject unit root)' if stationary else 'Non-stationary (has unit root)'}\n")
    
    if not stationary:
        parts.append("Consider differencing the series or using ARIMA with d≥1.\n")
    
    s = results['summary']
    parts.append(f"\n### Summary:\nN={s['nObs']}, Mean={s['mean']:.4f}, SD={s['std']:.4f}, Trend: {s['trend']}")
    
    if results['arima']:
        a = results['arima']
        parts.append(f"\n\n### ARIMA({a['order'][0]},{a['order'][1]},{a['order'][2]}):\nAIC={a['aic']:.2f}, BIC={a['bic']:.2f}")
    
    return '\n'.join(parts)


# ============== FIXED EFFECTS ==============

def perform_fixed_effects(df, dep_var, indep_vars, entity_var, time_var=None, fe_type='entity', language='Python'):
    """Perform Fixed Effects regression."""
    try:
        all_vars = [dep_var] + indep_vars + [entity_var]
        if time_var:
            all_vars.append(time_var)
        df_clean = df[all_vars].apply(pd.to_numeric, errors='coerce').dropna()
        
        if len(df_clean) < len(indep_vars) + 10:
            return {'error': 'Not enough observations for fixed effects.'}
        
        y = df_clean[dep_var]
        X = df_clean[indep_vars]
        
        # Demean the data (within transformation)
        if fe_type in ['entity', 'twoway']:
            entity_means = df_clean.groupby(entity_var)[indep_vars + [dep_var]].transform('mean')
            y_demeaned = y - entity_means[dep_var]
            X_demeaned = X - entity_means[indep_vars]
        else:
            y_demeaned = y
            X_demeaned = X
            
        if fe_type in ['time', 'twoway'] and time_var:
            time_means = df_clean.groupby(time_var)[indep_vars + [dep_var]].transform('mean')
            y_demeaned = y_demeaned - (y - time_means[dep_var]) if fe_type == 'twoway' else y - time_means[dep_var]
            X_demeaned = X_demeaned - (X - time_means[indep_vars]) if fe_type == 'twoway' else X - time_means[indep_vars]
        
        # Run regression on demeaned data
        X_demeaned = sm.add_constant(X_demeaned)
        model = sm.OLS(y_demeaned, X_demeaned).fit()
        
        coefficients = []
        for i, var in enumerate(X_demeaned.columns):
            if var == 'const':
                continue  # Skip constant in FE
            coefficients.append({
                'variable': var,
                'estimate': float(model.params[var]),
                'stdError': float(model.bse[var]),
                'tValue': float(model.tvalues[var]),
                'pValue': float(model.pvalues[var])
            })
        
        n_entities = df_clean[entity_var].nunique()
        n_times = df_clean[time_var].nunique() if time_var else 0
        
        results = {
            'coefficients': coefficients,
            'rSquared': float(model.rsquared),
            'rSquaredWithin': float(model.rsquared),
            'nObs': int(model.nobs),
            'nEntities': n_entities,
            'nTimes': n_times,
            'feType': fe_type
        }
        
        plots = generate_fe_plots(model, y_demeaned, dep_var)
        code = generate_fe_code(dep_var, indep_vars, entity_var, time_var, fe_type, language)
        interpretation = generate_fe_interpretation(results, dep_var, coefficients, fe_type)
        
        return {
            'results': results,
            'code': code,
            'plots': plots,
            'interpretation': interpretation,
            'analysisType': 'fixed_effects'
        }
    except Exception as e:
        import traceback
        return {'error': f'{str(e)}\n{traceback.format_exc()}'}

def generate_fe_plots(model, y, dep_var):
    plots = []
    plt.style.use('seaborn-v0_8-whitegrid')
    try:
        fig, axes = plt.subplots(1, 2, figsize=(12, 5))
        axes[0].scatter(model.fittedvalues, model.resid, alpha=0.5)
        axes[0].axhline(y=0, color='red', linestyle='--')
        axes[0].set_xlabel('Fitted Values')
        axes[0].set_ylabel('Residuals')
        axes[0].set_title('Residuals vs Fitted')
        
        axes[1].hist(model.resid, bins=30, edgecolor='black', alpha=0.7)
        axes[1].set_title('Residual Distribution')
        plt.tight_layout()
        plots.append({'image': fig_to_base64(fig), 'title': 'Fixed Effects Diagnostics'})
        plt.close(fig)
    except Exception as e:
        print(f"Plot error: {e}", file=sys.stderr)
    return plots

def generate_fe_code(dep_var, indep_vars, entity_var, time_var, fe_type, language):
    vars_str = ' + '.join(indep_vars)
    if language == 'Python':
        if fe_type == 'twoway':
            absorb = f"C({entity_var}) + C({time_var})"
        elif fe_type == 'time':
            absorb = f"C({time_var})"
        else:
            absorb = f"C({entity_var})"
        return f'''# Fixed Effects Regression (Python)
import pandas as pd
import statsmodels.formula.api as smf

df = pd.read_csv('your_data.csv')

# Using entity/time dummies (memory-intensive for large panels)
model = smf.ols('{dep_var} ~ {vars_str} + {absorb}', data=df).fit()
print(model.summary())

# Alternative: use linearmodels for large panels
# from linearmodels.panel import PanelOLS
# df = df.set_index(['{entity_var}', 'time_index'])
# model = PanelOLS(df['{dep_var}'], df[{indep_vars}], entity_effects=True).fit()
'''
    else:
        fe = 'twoways' if fe_type == 'twoway' else ('time' if fe_type == 'time' else 'individual')
        return f'''# Fixed Effects Regression (R)
library(plm)

df <- read.csv('your_data.csv')
pdata <- pdata.frame(df, index=c("{entity_var}"{', "' + time_var + '"' if time_var else ''}))

model <- plm({dep_var} ~ {vars_str}, data=pdata, model="within", effect="{fe}")
summary(model)
'''

def generate_fe_interpretation(results, dep_var, coefficients, fe_type):
    fe_name = {'entity': 'Entity', 'time': 'Time', 'twoway': 'Two-Way'}[fe_type]
    parts = [f"## {fe_name} Fixed Effects Results\n"]
    parts.append(f"R-squared (within): {results['rSquaredWithin']:.4f}")
    parts.append(f"N = {results['nObs']}, Entities = {results['nEntities']}")
    if results['nTimes']:
        parts.append(f", Time periods = {results['nTimes']}")
    parts.append("\n\n### Coefficients:\n")
    for c in coefficients:
        sig = "***" if c['pValue'] < 0.001 else "**" if c['pValue'] < 0.01 else "*" if c['pValue'] < 0.05 else ""
        parts.append(f"- {c['variable']}: {c['estimate']:.4f} {sig} (SE={c['stdError']:.4f})")
    parts.append("\n\n**Note**: Fixed effects absorb time-invariant characteristics.")
    return '\n'.join(parts)


# ============== ADF TEST (Standalone) ==============

def perform_adf_test(df, ts_var, date_var=None, language='Python'):
    """Perform ADF stationarity test."""
    try:
        from statsmodels.tsa.stattools import adfuller
        
        if date_var and date_var in df.columns:
            df = df.sort_values(date_var)
        
        series = pd.to_numeric(df[ts_var], errors='coerce').dropna()
        
        if len(series) < 10:
            return {'error': 'Time series too short (need at least 10 observations).'}
        
        adf_result = adfuller(series, autolag='AIC')
        
        results = {
            'statistic': float(adf_result[0]),
            'pValue': float(adf_result[1]),
            'usedLag': int(adf_result[2]),
            'nObs': int(adf_result[3]),
            'criticalValues': {k: float(v) for k, v in adf_result[4].items()},
            'isStationary': adf_result[1] < 0.05
        }
        
        plots = generate_adf_plots(series, ts_var, results)
        code = generate_adf_code(ts_var, language)
        interpretation = generate_adf_interpretation(results, ts_var)
        
        return {
            'results': results,
            'code': code,
            'plots': plots,
            'interpretation': interpretation,
            'analysisType': 'adf_test'
        }
    except Exception as e:
        return {'error': str(e)}

def generate_adf_plots(series, ts_var, results):
    plots = []
    plt.style.use('seaborn-v0_8-whitegrid')
    try:
        fig, axes = plt.subplots(1, 2, figsize=(12, 4))
        axes[0].plot(series.values)
        axes[0].set_title(f'{ts_var} - {"Stationary" if results["isStationary"] else "Non-Stationary"}')
        axes[0].set_xlabel('Time')
        
        # First difference
        diff_series = series.diff().dropna()
        axes[1].plot(diff_series.values)
        axes[1].set_title(f'First Difference of {ts_var}')
        axes[1].set_xlabel('Time')
        
        plt.tight_layout()
        plots.append({'image': fig_to_base64(fig), 'title': 'ADF Test Plots'})
        plt.close(fig)
    except Exception as e:
        print(f"Plot error: {e}", file=sys.stderr)
    return plots

def generate_adf_code(ts_var, language):
    if language == 'Python':
        return f'''# ADF Test (Python)
from statsmodels.tsa.stattools import adfuller
import pandas as pd

df = pd.read_csv('your_data.csv')
series = df['{ts_var}'].dropna()

result = adfuller(series, autolag='AIC')
print(f"ADF Statistic: {{result[0]:.4f}}")
print(f"p-value: {{result[1]:.4f}}")
print(f"Critical Values: {{result[4]}}")
print("Stationary" if result[1] < 0.05 else "Non-stationary (consider differencing)")
'''
    else:
        return f'''# ADF Test (R)
library(tseries)
df <- read.csv('your_data.csv')
adf.test(df${ts_var})
'''

def generate_adf_interpretation(results, ts_var):
    parts = [f"## ADF Test for {ts_var}\n"]
    parts.append(f"**ADF Statistic**: {results['statistic']:.4f}")
    parts.append(f"**p-value**: {results['pValue']:.4f}")
    parts.append(f"**Lags used**: {results['usedLag']}\n")
    parts.append("**Critical Values**:")
    for k, v in results['criticalValues'].items():
        parts.append(f"  {k}: {v:.4f}")
    parts.append(f"\n**Conclusion**: The series is **{'stationary' if results['isStationary'] else 'non-stationary'}**.")
    if not results['isStationary']:
        parts.append("Consider differencing the series (d=1) before modeling.")
    return '\n'.join(parts)


# ============== ACF/PACF (Standalone) ==============

def perform_acf_pacf(df, ts_var, date_var=None, language='Python'):
    """Generate ACF and PACF plots."""
    try:
        from statsmodels.tsa.stattools import acf, pacf
        
        if date_var and date_var in df.columns:
            df = df.sort_values(date_var)
        
        series = pd.to_numeric(df[ts_var], errors='coerce').dropna()
        
        if len(series) < 10:
            return {'error': 'Time series too short (need at least 10 observations).'}
        
        n_lags = min(40, len(series)//2 - 1)
        acf_vals = acf(series, nlags=n_lags)
        pacf_vals = pacf(series, nlags=n_lags)
        
        results = {
            'nObs': len(series),
            'nLags': n_lags,
            'acf': [float(x) for x in acf_vals],
            'pacf': [float(x) for x in pacf_vals],
            'suggestedAR': sum(1 for i, v in enumerate(pacf_vals[1:11]) if abs(v) > 1.96/np.sqrt(len(series))),
            'suggestedMA': sum(1 for i, v in enumerate(acf_vals[1:11]) if abs(v) > 1.96/np.sqrt(len(series)))
        }
        
        plots = generate_acf_pacf_plots(series, ts_var, n_lags)
        code = generate_acf_pacf_code(ts_var, language)
        interpretation = generate_acf_pacf_interpretation(results, ts_var)
        
        return {
            'results': results,
            'code': code,
            'plots': plots,
            'interpretation': interpretation,
            'analysisType': 'acf_pacf'
        }
    except Exception as e:
        return {'error': str(e)}

def generate_acf_pacf_plots(series, ts_var, n_lags):
    plots = []
    plt.style.use('seaborn-v0_8-whitegrid')
    try:
        from statsmodels.graphics.tsaplots import plot_acf, plot_pacf
        
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        
        axes[0, 0].plot(series.values)
        axes[0, 0].set_title(f'Time Series: {ts_var}')
        
        axes[0, 1].hist(series, bins=30, edgecolor='black', alpha=0.7)
        axes[0, 1].set_title('Distribution')
        
        plot_acf(series, ax=axes[1, 0], lags=n_lags)
        axes[1, 0].set_title('ACF')
        
        plot_pacf(series, ax=axes[1, 1], lags=n_lags)
        axes[1, 1].set_title('PACF')
        
        plt.tight_layout()
        plots.append({'image': fig_to_base64(fig), 'title': 'ACF/PACF Analysis'})
        plt.close(fig)
    except Exception as e:
        print(f"Plot error: {e}", file=sys.stderr)
    return plots

def generate_acf_pacf_code(ts_var, language):
    if language == 'Python':
        return f'''# ACF/PACF Analysis (Python)
import pandas as pd
import matplotlib.pyplot as plt
from statsmodels.graphics.tsaplots import plot_acf, plot_pacf

df = pd.read_csv('your_data.csv')
series = df['{ts_var}'].dropna()

fig, axes = plt.subplots(1, 2, figsize=(14, 5))
plot_acf(series, ax=axes[0], lags=40)
plot_pacf(series, ax=axes[1], lags=40)
plt.tight_layout()
plt.show()
'''
    else:
        return f'''# ACF/PACF Analysis (R)
df <- read.csv('your_data.csv')
par(mfrow=c(1,2))
acf(df${ts_var}, lag.max=40, main="ACF")
pacf(df${ts_var}, lag.max=40, main="PACF")
'''

def generate_acf_pacf_interpretation(results, ts_var):
    parts = [f"## ACF/PACF Analysis: {ts_var}\n"]
    parts.append(f"Observations: {results['nObs']}, Lags analyzed: {results['nLags']}\n")
    parts.append("### Suggested ARIMA orders:")
    parts.append(f"- AR (p) based on PACF: ~{results['suggestedAR']}")
    parts.append(f"- MA (q) based on ACF: ~{results['suggestedMA']}")
    parts.append("\n**Interpretation guide:**")
    parts.append("- PACF cuts off sharply → AR(p) model")
    parts.append("- ACF cuts off sharply → MA(q) model")
    parts.append("- Both decay gradually → ARMA model")
    return '\n'.join(parts)


# ============== ARIMA (User-specified) ==============

def perform_arima(df, ts_var, date_var=None, p=1, d=1, q=1, language='Python'):
    """Fit ARIMA model with user-specified parameters."""
    try:
        from statsmodels.tsa.arima.model import ARIMA
        
        if date_var and date_var in df.columns:
            df = df.sort_values(date_var)
        
        series = pd.to_numeric(df[ts_var], errors='coerce').dropna()
        
        if len(series) < p + d + q + 10:
            return {'error': 'Time series too short for specified ARIMA order.'}
        
        model = ARIMA(series, order=(p, d, q)).fit()
        
        # Forecast
        forecast_steps = min(10, len(series)//5)
        forecast = model.forecast(steps=forecast_steps)
        
        coefficients = []
        for name, val in model.params.items():
            coefficients.append({
                'variable': str(name),
                'estimate': float(val),
                'stdError': float(model.bse.get(name, 0)),
                'pValue': float(model.pvalues.get(name, 1))
            })
        
        results = {
            'order': [p, d, q],
            'coefficients': coefficients,
            'aic': float(model.aic),
            'bic': float(model.bic),
            'logLikelihood': float(model.llf),
            'nObs': int(model.nobs),
            'forecast': [float(x) for x in forecast]
        }
        
        plots = generate_arima_plots(series, model, ts_var, p, d, q)
        code = generate_arima_code(ts_var, p, d, q, language)
        interpretation = generate_arima_interpretation(results, ts_var)
        
        return {
            'results': results,
            'code': code,
            'plots': plots,
            'interpretation': interpretation,
            'analysisType': 'arima'
        }
    except Exception as e:
        import traceback
        return {'error': f'{str(e)}\n{traceback.format_exc()}'}

def generate_arima_plots(series, model, ts_var, p, d, q):
    plots = []
    plt.style.use('seaborn-v0_8-whitegrid')
    try:
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        
        # Original series and fitted
        axes[0, 0].plot(series.values, label='Actual', alpha=0.7)
        axes[0, 0].plot(model.fittedvalues, label='Fitted', alpha=0.7)
        axes[0, 0].set_title(f'ARIMA({p},{d},{q}) Fit')
        axes[0, 0].legend()
        
        # Residuals
        axes[0, 1].plot(model.resid)
        axes[0, 1].axhline(y=0, color='red', linestyle='--')
        axes[0, 1].set_title('Residuals')
        
        # Residual histogram
        axes[1, 0].hist(model.resid, bins=30, edgecolor='black', alpha=0.7)
        axes[1, 0].set_title('Residual Distribution')
        
        # Forecast
        forecast_steps = min(10, len(series)//5)
        forecast = model.forecast(steps=forecast_steps)
        axes[1, 1].plot(range(len(series)), series.values, label='Historical')
        axes[1, 1].plot(range(len(series), len(series)+forecast_steps), forecast, 'r--', label='Forecast')
        axes[1, 1].set_title('Forecast')
        axes[1, 1].legend()
        
        plt.tight_layout()
        plots.append({'image': fig_to_base64(fig), 'title': f'ARIMA({p},{d},{q}) Analysis'})
        plt.close(fig)
    except Exception as e:
        print(f"Plot error: {e}", file=sys.stderr)
    return plots

def generate_arima_code(ts_var, p, d, q, language):
    if language == 'Python':
        return f'''# ARIMA({p},{d},{q}) Model (Python)
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
import matplotlib.pyplot as plt

df = pd.read_csv('your_data.csv')
series = df['{ts_var}'].dropna()

model = ARIMA(series, order=({p}, {d}, {q})).fit()
print(model.summary())

# Forecast
forecast = model.forecast(steps=10)
print("\\nForecast:", forecast.values)

# Plot
fig, ax = plt.subplots(figsize=(12, 6))
ax.plot(series.values, label='Actual')
ax.plot(model.fittedvalues, label='Fitted')
ax.legend()
plt.show()
'''
    else:
        return f'''# ARIMA({p},{d},{q}) Model (R)
library(forecast)

df <- read.csv('your_data.csv')
series <- ts(df${ts_var})

model <- arima(series, order=c({p}, {d}, {q}))
summary(model)

# Forecast
forecast(model, h=10)
plot(forecast(model, h=10))
'''

def generate_arima_interpretation(results, ts_var):
    p, d, q = results['order']
    parts = [f"## ARIMA({p},{d},{q}) Model for {ts_var}\n"]
    parts.append(f"**Model Fit**: AIC={results['aic']:.2f}, BIC={results['bic']:.2f}")
    parts.append(f"Log-Likelihood: {results['logLikelihood']:.2f}, N={results['nObs']}\n")
    
    parts.append("### Coefficients:")
    for c in results['coefficients']:
        sig = "***" if c['pValue'] < 0.001 else "**" if c['pValue'] < 0.01 else "*" if c['pValue'] < 0.05 else ""
        parts.append(f"- {c['variable']}: {c['estimate']:.4f} {sig}")
    
    parts.append(f"\n### Model components:")
    parts.append(f"- AR({p}): {p} autoregressive terms")
    parts.append(f"- I({d}): {d} differencing order")
    parts.append(f"- MA({q}): {q} moving average terms")
    
    return '\n'.join(parts)


# ============== VAR ==============

def perform_var(df, variables, lags=1, date_var=None, language='Python'):
    """Fit VAR model."""
    try:
        from statsmodels.tsa.api import VAR
        
        if date_var and date_var in df.columns:
            df = df.sort_values(date_var)
        
        data = df[variables].apply(pd.to_numeric, errors='coerce').dropna()
        
        if len(data) < lags * len(variables) + 10:
            return {'error': 'Not enough observations for VAR model.'}
        
        model = VAR(data)
        fitted = model.fit(lags)
        
        # Granger causality tests
        granger_tests = {}
        for var in variables:
            try:
                test = fitted.test_causality(var, variables, kind='f')
                granger_tests[var] = {
                    'fStatistic': float(test.test_statistic),
                    'pValue': float(test.pvalue)
                }
            except:
                pass
        
        results = {
            'variables': variables,
            'lags': lags,
            'nObs': int(fitted.nobs),
            'aic': float(fitted.aic),
            'bic': float(fitted.bic),
            'grangerTests': granger_tests
        }
        
        plots = generate_var_plots(data, fitted, variables)
        code = generate_var_code(variables, lags, language)
        interpretation = generate_var_interpretation(results)
        
        return {
            'results': results,
            'code': code,
            'plots': plots,
            'interpretation': interpretation,
            'analysisType': 'var'
        }
    except Exception as e:
        import traceback
        return {'error': f'{str(e)}\n{traceback.format_exc()}'}

def generate_var_plots(data, fitted, variables):
    plots = []
    plt.style.use('seaborn-v0_8-whitegrid')
    try:
        n_vars = len(variables)
        fig, axes = plt.subplots(n_vars, 2, figsize=(14, 4*n_vars))
        if n_vars == 1:
            axes = axes.reshape(1, -1)
        
        for i, var in enumerate(variables):
            axes[i, 0].plot(data[var].values)
            axes[i, 0].set_title(f'{var} - Time Series')
            
            # IRF would require more setup, show residuals instead
            resid = fitted.resid[var] if hasattr(fitted, 'resid') else []
            if len(resid) > 0:
                axes[i, 1].plot(resid)
                axes[i, 1].axhline(y=0, color='red', linestyle='--')
                axes[i, 1].set_title(f'{var} - Residuals')
        
        plt.tight_layout()
        plots.append({'image': fig_to_base64(fig), 'title': 'VAR Analysis'})
        plt.close(fig)
    except Exception as e:
        print(f"Plot error: {e}", file=sys.stderr)
    return plots

def generate_var_code(variables, lags, language):
    vars_str = str(variables)
    if language == 'Python':
        return f'''# VAR Model (Python)
import pandas as pd
from statsmodels.tsa.api import VAR

df = pd.read_csv('your_data.csv')
data = df[{vars_str}].dropna()

model = VAR(data)
fitted = model.fit({lags})
print(fitted.summary())

# Granger Causality
for var in {vars_str}:
    print(f"\\nGranger causality test for {{var}}:")
    print(fitted.test_causality(var, {vars_str}, kind='f'))

# Impulse Response
irf = fitted.irf(10)
irf.plot()
'''
    else:
        return f'''# VAR Model (R)
library(vars)

df <- read.csv('your_data.csv')
data <- df[, c({', '.join([f'"{v}"' for v in variables])})]

model <- VAR(data, p={lags})
summary(model)

# Granger Causality
causality(model)

# Impulse Response
irf <- irf(model, n.ahead=10)
plot(irf)
'''

def generate_var_interpretation(results):
    parts = [f"## VAR({results['lags']}) Model\n"]
    parts.append(f"Variables: {', '.join(results['variables'])}")
    parts.append(f"N = {results['nObs']}, Lags = {results['lags']}")
    parts.append(f"AIC = {results['aic']:.2f}, BIC = {results['bic']:.2f}\n")
    
    if results['grangerTests']:
        parts.append("### Granger Causality Tests:")
        for var, test in results['grangerTests'].items():
            sig = "*" if test['pValue'] < 0.05 else ""
            parts.append(f"- {var}: F={test['fStatistic']:.2f}, p={test['pValue']:.4f} {sig}")
    
    parts.append("\n**Interpretation**: VAR captures dynamic interdependencies.")
    return '\n'.join(parts)


# ============== VECM ==============

def perform_vecm(df, variables, lags=1, coint_rank=1, date_var=None, language='Python'):
    """Fit VECM model."""
    try:
        from statsmodels.tsa.vector_ar.vecm import VECM, coint_johansen
        
        if date_var and date_var in df.columns:
            df = df.sort_values(date_var)
        
        data = df[variables].apply(pd.to_numeric, errors='coerce').dropna()
        
        if len(data) < lags * len(variables) + 20:
            return {'error': 'Not enough observations for VECM model.'}
        
        # Johansen cointegration test
        johansen = coint_johansen(data, det_order=0, k_ar_diff=lags)
        
        # Fit VECM
        model = VECM(data, k_ar_diff=lags, coint_rank=coint_rank)
        fitted = model.fit()
        
        results = {
            'variables': variables,
            'lags': lags,
            'cointRank': coint_rank,
            'nObs': int(len(data) - lags),
            'johansenTrace': [float(x) for x in johansen.lr1],
            'johansenCritical': [float(x) for x in johansen.cvt[:, 1]],  # 5% critical values
            'cointVectors': johansen.evec[:, :coint_rank].tolist() if coint_rank <= johansen.evec.shape[1] else []
        }
        
        plots = generate_vecm_plots(data, variables)
        code = generate_vecm_code(variables, lags, coint_rank, language)
        interpretation = generate_vecm_interpretation(results)
        
        return {
            'results': results,
            'code': code,
            'plots': plots,
            'interpretation': interpretation,
            'analysisType': 'vecm'
        }
    except Exception as e:
        import traceback
        return {'error': f'{str(e)}\n{traceback.format_exc()}'}

def generate_vecm_plots(data, variables):
    plots = []
    plt.style.use('seaborn-v0_8-whitegrid')
    try:
        n_vars = len(variables)
        fig, axes = plt.subplots(n_vars, 1, figsize=(12, 3*n_vars))
        if n_vars == 1:
            axes = [axes]
        
        for i, var in enumerate(variables):
            axes[i].plot(data[var].values)
            axes[i].set_title(f'{var}')
            axes[i].set_xlabel('Time')
        
        plt.tight_layout()
        plots.append({'image': fig_to_base64(fig), 'title': 'VECM Variables'})
        plt.close(fig)
    except Exception as e:
        print(f"Plot error: {e}", file=sys.stderr)
    return plots

def generate_vecm_code(variables, lags, coint_rank, language):
    vars_str = str(variables)
    if language == 'Python':
        return f'''# VECM Model (Python)
import pandas as pd
from statsmodels.tsa.vector_ar.vecm import VECM, coint_johansen

df = pd.read_csv('your_data.csv')
data = df[{vars_str}].dropna()

# Johansen Cointegration Test
johansen = coint_johansen(data, det_order=0, k_ar_diff={lags})
print("Trace Statistics:", johansen.lr1)
print("Critical Values (5%):", johansen.cvt[:, 1])

# Fit VECM
model = VECM(data, k_ar_diff={lags}, coint_rank={coint_rank})
fitted = model.fit()
print(fitted.summary())
'''
    else:
        return f'''# VECM Model (R)
library(urca)
library(vars)

df <- read.csv('your_data.csv')
data <- df[, c({', '.join([f'"{v}"' for v in variables])})]

# Johansen Test
johansen <- ca.jo(data, type="trace", K={lags}, spec="transitory")
summary(johansen)

# Fit VECM
vecm <- cajorls(johansen, r={coint_rank})
summary(vecm)
'''

def generate_vecm_interpretation(results):
    parts = [f"## VECM Model\n"]
    parts.append(f"Variables: {', '.join(results['variables'])}")
    parts.append(f"Lags: {results['lags']}, Cointegration Rank: {results['cointRank']}")
    parts.append(f"N = {results['nObs']}\n")
    
    parts.append("### Johansen Cointegration Test:")
    for i, (trace, crit) in enumerate(zip(results['johansenTrace'], results['johansenCritical'])):
        reject = trace > crit
        parts.append(f"- r≤{i}: Trace={trace:.2f}, Crit(5%)={crit:.2f} {'(reject)' if reject else ''}")
    
    parts.append("\n**Interpretation**: VECM models long-run equilibrium relationships.")
    return '\n'.join(parts)


# ============== DATA TRANSFORMATIONS ==============

def perform_transform(df, transform_type, config, language='Python'):
    """Perform data transformation."""
    try:
        original_rows = len(df)
        original_cols = list(df.columns)
        
        if transform_type == 'log_transform':
            variable = config.get('variable')
            new_name = config.get('newName') or f'log_{variable}'
            
            if not variable or variable not in df.columns:
                return {'error': f'Variable "{variable}" not found'}
            
            df[new_name] = np.log(pd.to_numeric(df[variable], errors='coerce'))
            description = f"Created log-transformed variable '{new_name}' from '{variable}'"
            code = f"df['{new_name}'] = np.log(df['{variable}'])" if language == 'Python' else f"df${new_name} <- log(df${variable})"
            
        elif transform_type == 'create_variable':
            new_name = config.get('newName')
            formula = config.get('formula')
            
            if not new_name or not formula:
                return {'error': 'Please provide variable name and formula'}
            
            # Safe evaluation with only column references
            try:
                # Replace column names with df['col'] syntax for Python
                eval_formula = formula
                for col in df.columns:
                    eval_formula = eval_formula.replace(col, f"df['{col}']")
                df[new_name] = eval(eval_formula)
                description = f"Created variable '{new_name}' = {formula}"
                code = f"df['{new_name}'] = {eval_formula}" if language == 'Python' else f"df${new_name} <- with(df, {formula})"
            except Exception as e:
                return {'error': f'Invalid formula: {str(e)}'}
            
        elif transform_type == 'standardize':
            variable = config.get('variable')
            new_name = f'{variable}_std'
            
            if not variable or variable not in df.columns:
                return {'error': f'Variable "{variable}" not found'}
            
            col = pd.to_numeric(df[variable], errors='coerce')
            df[new_name] = (col - col.mean()) / col.std()
            description = f"Created standardized variable '{new_name}' (z-score of '{variable}')"
            code = f"df['{new_name}'] = (df['{variable}'] - df['{variable}'].mean()) / df['{variable}'].std()" if language == 'Python' else f"df${new_name} <- scale(df${variable})"
            
        elif transform_type == 'lag_variable':
            variable = config.get('variable')
            lag = config.get('lag', 1)
            new_name = f'{variable}_lag{lag}'
            
            if not variable or variable not in df.columns:
                return {'error': f'Variable "{variable}" not found'}
            
            df[new_name] = df[variable].shift(lag)
            description = f"Created lagged variable '{new_name}' ({lag}-period lag of '{variable}')"
            code = f"df['{new_name}'] = df['{variable}'].shift({lag})" if language == 'Python' else f"df${new_name} <- dplyr::lag(df${variable}, {lag})"
            
        elif transform_type == 'filter_data':
            variable = config.get('variable')
            operator = config.get('operator')
            value = config.get('value')
            
            if not variable or not operator or value is None:
                return {'error': 'Please provide variable, operator, and value'}
            
            if variable not in df.columns:
                return {'error': f'Variable "{variable}" not found'}
            
            # Convert value to appropriate type
            try:
                numeric_value = float(value)
                compare_value = numeric_value
            except:
                compare_value = value
            
            col = pd.to_numeric(df[variable], errors='coerce') if isinstance(compare_value, (int, float)) else df[variable]
            
            if operator == '>':
                mask = col > compare_value
            elif operator == '>=':
                mask = col >= compare_value
            elif operator == '<':
                mask = col < compare_value
            elif operator == '<=':
                mask = col <= compare_value
            elif operator == '==':
                mask = col == compare_value
            elif operator == '!=':
                mask = col != compare_value
            else:
                return {'error': f'Invalid operator: {operator}'}
            
            df = df[mask].reset_index(drop=True)
            rows_removed = original_rows - len(df)
            description = f"Filtered data where {variable} {operator} {value}. Removed {rows_removed} rows."
            code = f"df = df[df['{variable}'] {operator} {value}]" if language == 'Python' else f"df <- df[df${variable} {operator} {value}, ]"
            
        elif transform_type == 'drop_missing':
            variables = config.get('variables', [])
            
            if variables and len(variables) > 0:
                df = df.dropna(subset=variables).reset_index(drop=True)
                description = f"Dropped rows with missing values in: {', '.join(variables)}"
                code = f"df = df.dropna(subset={variables})" if language == 'Python' else f"df <- df[complete.cases(df[, c({', '.join([chr(34)+v+chr(34) for v in variables])})]), ]"
            else:
                df = df.dropna().reset_index(drop=True)
                description = "Dropped all rows with any missing values"
                code = "df = df.dropna()" if language == 'Python' else "df <- na.omit(df)"
            
        else:
            return {'error': f'Unknown transform type: {transform_type}'}
        
        # Convert back to CSV
        output = io.StringIO()
        df.to_csv(output, index=False)
        transformed_data = output.getvalue()
        
        return {
            'transformedData': transformed_data,
            'columns': list(df.columns),
            'code': code,
            'description': description,
            'rowsAffected': original_rows - len(df) if transform_type in ['filter_data', 'drop_missing'] else 0,
            'newColumns': [c for c in df.columns if c not in original_cols]
        }
        
    except Exception as e:
        import traceback
        return {'error': f'{str(e)}\n{traceback.format_exc()}'}


# ============== MAIN ==============

def clean_for_json(obj):
    """Recursively clean object for JSON serialization (handle NaN, Inf)."""
    if isinstance(obj, dict):
        return {k: clean_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_for_json(item) for item in obj]
    elif isinstance(obj, float):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return obj
    elif isinstance(obj, (np.floating, np.integer)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return clean_for_json(obj.tolist())
    else:
        return obj

def main():
    try:
        input_data = sys.stdin.read()
        params = json.loads(input_data)
        
        data = params.get('data')
        analysis_type = params.get('analysisType', 'regression')
        language = params.get('language', 'Python')
        
        if not data:
            print(json.dumps({'error': 'No data provided'}))
            sys.exit(1)
        
        df = pd.read_csv(io.StringIO(data))
        df.columns = df.columns.str.strip()
        
        if analysis_type == 'transform':
            transform_type = params.get('transformType')
            config = params.get('config', {})
            result = perform_transform(df, transform_type, config, language)
            
        elif analysis_type == 'descriptive':
            selected_vars = params.get('selectedVars', [])
            result = perform_descriptive_statistics(df, selected_vars, language)
            
        elif analysis_type == 'regression':
            dependent_var = params.get('dependentVar')
            independent_vars = params.get('independentVars', [])
            result = perform_regression(df, dependent_var, independent_vars, language)
            
        elif analysis_type == 'logit':
            dependent_var = params.get('dependentVar')
            independent_vars = params.get('independentVars', [])
            result = perform_logit(df, dependent_var, independent_vars, language)
            
        elif analysis_type == 'probit':
            dependent_var = params.get('dependentVar')
            independent_vars = params.get('independentVars', [])
            result = perform_probit(df, dependent_var, independent_vars, language)
            
        elif analysis_type == 'iv':
            dependent_var = params.get('dependentVar')
            endogenous_var = params.get('endogenousVar')
            instrument_vars = params.get('instrumentVars', [])
            exogenous_vars = params.get('exogenousVars', [])
            result = perform_iv_regression(df, dependent_var, endogenous_var, instrument_vars, exogenous_vars, language)
            
        elif analysis_type == 'did':
            outcome_var = params.get('outcomeVar')
            treatment_var = params.get('treatmentVar')
            time_var = params.get('timeVar')
            control_vars = params.get('controlVars', [])
            result = perform_did(df, outcome_var, treatment_var, time_var, control_vars, language)
            
        elif analysis_type == 'fixed_effects':
            dependent_var = params.get('dependentVar')
            independent_vars = params.get('independentVars', [])
            entity_var = params.get('entityVar')
            time_fe_var = params.get('timeFeVar')
            fe_type = params.get('feType', 'entity')
            result = perform_fixed_effects(df, dependent_var, independent_vars, entity_var, time_fe_var, fe_type, language)
            
        elif analysis_type == 'adf_test':
            ts_var = params.get('timeSeriesVar')
            date_var = params.get('dateVar')
            result = perform_adf_test(df, ts_var, date_var, language)
            
        elif analysis_type == 'acf_pacf':
            ts_var = params.get('timeSeriesVar')
            date_var = params.get('dateVar')
            result = perform_acf_pacf(df, ts_var, date_var, language)
            
        elif analysis_type == 'arima':
            ts_var = params.get('timeSeriesVar')
            date_var = params.get('dateVar')
            p = params.get('arimaP', 1)
            d = params.get('arimaD', 1)
            q = params.get('arimaQ', 1)
            result = perform_arima(df, ts_var, date_var, p, d, q, language)
            
        elif analysis_type == 'var':
            var_variables = params.get('varVariables', [])
            var_lags = params.get('varLags', 1)
            date_var = params.get('dateVar')
            result = perform_var(df, var_variables, var_lags, date_var, language)
            
        elif analysis_type == 'vecm':
            var_variables = params.get('varVariables', [])
            var_lags = params.get('varLags', 1)
            vecm_rank = params.get('vecmRank', 1)
            date_var = params.get('dateVar')
            result = perform_vecm(df, var_variables, var_lags, vecm_rank, date_var, language)
            
        elif analysis_type == 'timeseries':
            # Legacy - kept for backward compatibility
            ts_var = params.get('timeSeriesVar')
            date_var = params.get('dateVar')
            result = perform_timeseries(df, ts_var, date_var, language)
            
        else:
            result = {'error': f'Unknown analysis type: {analysis_type}'}
        
        # Clean result for JSON (handle NaN, Inf values)
        result = clean_for_json(result)
        print(json.dumps(result))
        
    except json.JSONDecodeError as e:
        print(json.dumps({'error': f'Invalid JSON: {str(e)}'}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({'error': f'Error: {str(e)}'}))
        sys.exit(1)

if __name__ == '__main__':
    main()
