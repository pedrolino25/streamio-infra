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

