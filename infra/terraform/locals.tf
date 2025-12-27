locals {
  project_name = "streamio"
  
  # CloudFront trusted key groups (empty if no public key provided)
  cloudfront_trusted_key_groups = length(aws_cloudfront_key_group.key_group) > 0 ? [aws_cloudfront_key_group.key_group[0].id] : []
  
  # Environment-scoped subdomain: dev → cdn-dev.example.com, prod → cdn.example.com
  cloudfront_subdomain = var.environment == "prod" ? "cdn" : "cdn-${var.environment}"
  cloudfront_domain    = "${local.cloudfront_subdomain}.${var.domain_name}"
  
  # Environment-scoped API subdomain: dev → api-dev.example.com, prod → api.example.com
  api_subdomain = var.environment == "prod" ? "api" : "api-${var.environment}"
  api_domain    = "${local.api_subdomain}.${var.domain_name}"
}
