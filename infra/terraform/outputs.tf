output "api_id" {
  value = aws_api_gateway_rest_api.api.id
}

output "api_gateway_url" {
  value       = "https://${aws_api_gateway_domain_name.api.domain_name}/${var.environment}"
  description = "API Gateway base URL"
}

output "api_gateway_custom_domain" {
  value       = "https://${local.api_domain}"
  description = "API Gateway custom domain URL (environment-scoped)"
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

output "acm_certificate_arn" {
  value       = aws_acm_certificate.cloudfront.arn
  description = "ACM certificate ARN for CloudFront (in us-east-1)"
}

output "acm_certificate_status" {
  value       = aws_acm_certificate_validation.cloudfront.certificate_arn != "" ? "Validated" : "Pending"
  description = "ACM certificate validation status"
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

output "cloudfront_distribution_arn" {
  value       = aws_cloudfront_distribution.cdn.arn
  description = "CloudFront distribution ARN (used in S3 bucket policy condition)"
}

output "s3_processed_bucket_name" {
  value       = aws_s3_bucket.processed.id
  description = "S3 processed bucket name"
}
