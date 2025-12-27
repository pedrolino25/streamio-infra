output "api_id" {
  value = aws_api_gateway_rest_api.api.id
}

output "cloudfront_domain" {
  value       = aws_cloudfront_distribution.cdn.domain_name
  description = "CloudFront distribution domain name (CloudFront-generated)"
}

output "cloudfront_custom_domain" {
  value       = local.cloudfront_domain
  description = "Custom domain name for CloudFront (environment-scoped)"
}

output "route53_zone_id" {
  value       = aws_route53_zone.root.zone_id
  description = "Route53 hosted zone ID for the root domain"
}

output "route53_nameservers" {
  value       = aws_route53_zone.root.name_servers
  description = "Route53 nameservers for the root domain. Configure these at your domain registrar."
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
