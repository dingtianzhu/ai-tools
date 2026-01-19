use serde::{Deserialize, Serialize};
use tiktoken_rs::{cl100k_base, p50k_base, r50k_base, CoreBPE};

use crate::error::AppError;

/// Token estimation result
#[derive(Debug, Serialize, Deserialize)]
pub struct TokenEstimate {
    pub token_count: usize,
    pub model_type: String,
}

/// Get the appropriate tokenizer for a model type
fn get_tokenizer(model_type: &str) -> Result<CoreBPE, AppError> {
    match model_type.to_lowercase().as_str() {
        "gpt-4" | "gpt-4-turbo" | "gpt-3.5-turbo" | "text-embedding-ada-002" => {
            cl100k_base().map_err(|e| AppError::IoError(format!("Failed to load tokenizer: {}", e)))
        }
        "gpt-3" | "text-davinci-003" | "text-davinci-002" => {
            p50k_base().map_err(|e| AppError::IoError(format!("Failed to load tokenizer: {}", e)))
        }
        "gpt-2" | "codex" => {
            r50k_base().map_err(|e| AppError::IoError(format!("Failed to load tokenizer: {}", e)))
        }
        _ => {
            // Default to cl100k_base for unknown models
            cl100k_base().map_err(|e| AppError::IoError(format!("Failed to load tokenizer: {}", e)))
        }
    }
}

/// Estimate token count for a single text
#[tauri::command]
pub fn estimate_tokens(text: String, model_type: String) -> Result<usize, String> {
    estimate_tokens_impl(&text, &model_type).map_err(|e| e.to_string())
}

fn estimate_tokens_impl(text: &str, model_type: &str) -> Result<usize, AppError> {
    let tokenizer = get_tokenizer(model_type)?;
    let tokens = tokenizer.encode_with_special_tokens(text);
    Ok(tokens.len())
}

/// Estimate token count for multiple texts
#[tauri::command]
pub fn estimate_tokens_batch(texts: Vec<String>, model_type: String) -> Result<Vec<usize>, String> {
    estimate_tokens_batch_impl(&texts, &model_type).map_err(|e| e.to_string())
}

fn estimate_tokens_batch_impl(texts: &[String], model_type: &str) -> Result<Vec<usize>, AppError> {
    let tokenizer = get_tokenizer(model_type)?;
    
    let mut results = Vec::with_capacity(texts.len());
    for text in texts {
        let tokens = tokenizer.encode_with_special_tokens(text);
        results.push(tokens.len());
    }
    
    Ok(results)
}

/// Get the token limit for a specific model
#[tauri::command]
pub fn get_token_limit(model_type: String) -> Result<usize, String> {
    get_token_limit_impl(&model_type).map_err(|e| e.to_string())
}

fn get_token_limit_impl(model_type: &str) -> Result<usize, AppError> {
    let limit = match model_type.to_lowercase().as_str() {
        "gpt-4" => 8192,
        "gpt-4-32k" => 32768,
        "gpt-4-turbo" => 128000,
        "gpt-3.5-turbo" => 4096,
        "gpt-3.5-turbo-16k" => 16384,
        "text-davinci-003" => 4096,
        "text-davinci-002" => 4096,
        "gpt-2" => 1024,
        "codex" => 8000,
        "claude-3-opus" => 200000,
        "claude-3-sonnet" => 200000,
        "claude-3-haiku" => 200000,
        "llama-2-7b" => 4096,
        "llama-2-13b" => 4096,
        "llama-2-70b" => 4096,
        "llama-3-8b" => 8192,
        "llama-3-70b" => 8192,
        "mistral-7b" => 8192,
        "mixtral-8x7b" => 32768,
        _ => 4096, // Default fallback
    };
    
    Ok(limit)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_estimate_tokens_simple() {
        let result = estimate_tokens_impl("Hello, world!", "gpt-4");
        assert!(result.is_ok());
        let count = result.unwrap();
        assert!(count > 0);
        assert!(count < 10); // "Hello, world!" should be less than 10 tokens
    }

    #[test]
    fn test_estimate_tokens_empty() {
        let result = estimate_tokens_impl("", "gpt-4");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }

    #[test]
    fn test_estimate_tokens_batch() {
        let texts = vec![
            "Hello".to_string(),
            "World".to_string(),
            "Test".to_string(),
        ];
        let result = estimate_tokens_batch_impl(&texts, "gpt-4");
        assert!(result.is_ok());
        let counts = result.unwrap();
        assert_eq!(counts.len(), 3);
        assert!(counts.iter().all(|&c| c > 0));
    }

    #[test]
    fn test_get_token_limit() {
        assert_eq!(get_token_limit_impl("gpt-4").unwrap(), 8192);
        assert_eq!(get_token_limit_impl("gpt-4-32k").unwrap(), 32768);
        assert_eq!(get_token_limit_impl("gpt-3.5-turbo").unwrap(), 4096);
        assert_eq!(get_token_limit_impl("unknown-model").unwrap(), 4096);
    }

    #[test]
    fn test_different_model_types() {
        let text = "This is a test sentence.";
        
        let gpt4_result = estimate_tokens_impl(text, "gpt-4");
        assert!(gpt4_result.is_ok());
        
        let gpt3_result = estimate_tokens_impl(text, "gpt-3");
        assert!(gpt3_result.is_ok());
        
        // Different tokenizers may produce different counts
        // but both should be reasonable
        assert!(gpt4_result.unwrap() > 0);
        assert!(gpt3_result.unwrap() > 0);
    }
}

#[cfg(test)]
mod property_tests {
    use super::*;
    use proptest::prelude::*;

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(10))]
        
        // Property 8: Token Estimation Accuracy
        // **Validates: Requirements 5.3**
        #[test]
        fn property_8_token_estimation_accuracy(
            text in "[a-zA-Z0-9 .,!?\\n]{0,500}",
            model in prop::sample::select(vec!["gpt-4", "gpt-3.5-turbo"])
        ) {
            let result = estimate_tokens_impl(&text, &model);
            
            // Should always succeed
            prop_assert!(result.is_ok());
            
            let token_count = result.unwrap();
            
            // Empty text should have 0 tokens
            if text.is_empty() {
                prop_assert_eq!(token_count, 0);
            } else {
                // Non-empty text should have at least 1 token
                prop_assert!(token_count > 0);
                
                // Token count should be reasonable (not more than 2x the character count)
                // This is a rough heuristic - actual ratio varies by language
                prop_assert!(token_count <= text.len() * 2);
            }
            
            // Estimating the same text twice should give the same result
            let result2 = estimate_tokens_impl(&text, &model).unwrap();
            prop_assert_eq!(token_count, result2);
        }
    }
    
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(10))]
        
        #[test]
        fn property_8_batch_estimation_consistency(
            texts in prop::collection::vec("[a-zA-Z0-9 ]+", 1..5),
            model in prop::sample::select(vec!["gpt-4"])
        ) {
            // Batch estimation should give same results as individual estimation
            let batch_result = estimate_tokens_batch_impl(&texts, &model);
            prop_assert!(batch_result.is_ok());
            
            let batch_counts = batch_result.unwrap();
            prop_assert_eq!(batch_counts.len(), texts.len());
            
            // Each batch result should match individual estimation
            for (i, text) in texts.iter().enumerate() {
                let individual_count = estimate_tokens_impl(text, &model).unwrap();
                prop_assert_eq!(batch_counts[i], individual_count);
            }
        }
    }
    
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(10))]
        
        #[test]
        fn property_8_token_limit_consistency(
            model in prop::sample::select(vec![
                "gpt-4", "gpt-4-32k", "gpt-3.5-turbo", "claude-3-opus", "unknown-model"
            ])
        ) {
            let result = get_token_limit_impl(&model);
            prop_assert!(result.is_ok());
            
            let limit = result.unwrap();
            
            // Token limit should be positive and reasonable
            prop_assert!(limit > 0);
            prop_assert!(limit <= 200000); // Max known limit is Claude's 200k
            
            // Getting limit twice should give same result
            let limit2 = get_token_limit_impl(&model).unwrap();
            prop_assert_eq!(limit, limit2);
        }
    }
    
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(10))]
        
        #[test]
        fn property_8_concatenation_additivity(
            text1 in "[a-zA-Z0-9 ]{1,50}",
            text2 in "[a-zA-Z0-9 ]{1,50}",
            model in prop::sample::select(vec!["gpt-4"])
        ) {
            let count1 = estimate_tokens_impl(&text1, &model).unwrap();
            let count2 = estimate_tokens_impl(&text2, &model).unwrap();
            let combined = format!("{}{}", text1, text2);
            let combined_count = estimate_tokens_impl(&combined, &model).unwrap();
            
            // Combined count should be close to sum of individual counts
            // (may not be exact due to tokenization boundaries)
            // Allow for some variance (within 20% or 3 tokens)
            let sum = count1 + count2;
            let diff = if combined_count > sum {
                combined_count - sum
            } else {
                sum - combined_count
            };
            
            let tolerance = std::cmp::max(3, sum / 5);
            prop_assert!(diff <= tolerance, 
                "Combined count {} differs too much from sum {} (diff: {})", 
                combined_count, sum, diff);
        }
    }
}
