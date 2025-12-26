output "api_id" {
  value = aws_api_gateway_rest_api.api.id
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.cdn.domain_name
}

output "cognito_user_pool_id" {
  value       = aws_cognito_user_pool.admin.id
  description = "Cognito User Pool ID for admin authentication"
}

output "cognito_user_pool_client_id" {
  value       = aws_cognito_user_pool_client.admin.id
  description = "Cognito User Pool Client ID for admin dashboard"
}

output "cognito_identity_pool_id" {
  value       = aws_cognito_identity_pool.admin.id
  description = "Cognito Identity Pool ID for AWS resource access"
}

output "cognito_region" {
  value       = data.aws_region.current.name
  description = "AWS region for Cognito"
}
