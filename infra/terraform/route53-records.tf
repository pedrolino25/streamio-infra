############################################
# Route53 Alias Record for CloudFront
# Points environment-scoped subdomain to CloudFront distribution
############################################
resource "aws_route53_record" "cloudfront_alias" {
  zone_id = aws_route53_zone.root.zone_id
  name    = local.cloudfront_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.cdn.domain_name
    zone_id                = aws_cloudfront_distribution.cdn.hosted_zone_id
    evaluate_target_health = false
  }
}

############################################
# Route53 Alias Record for API Gateway
# Points environment-scoped api subdomain to API Gateway custom domain
############################################
resource "aws_route53_record" "api_alias" {
  zone_id = aws_route53_zone.root.zone_id
  name    = local.api_domain
  type    = "A"

  alias {
    name                   = aws_api_gateway_domain_name.api.regional_domain_name
    zone_id                = aws_api_gateway_domain_name.api.regional_zone_id
    evaluate_target_health = false
  }
}

