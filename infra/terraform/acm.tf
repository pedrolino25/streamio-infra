############################################
# ACM Certificate for CloudFront
# CloudFront requires certificates in us-east-1
############################################
resource "aws_acm_certificate" "cloudfront" {
  provider          = aws.us_east_1
  domain_name       = local.cloudfront_domain
  validation_method = "DNS"

  tags = {
    Name        = "${local.project_name}-${var.environment}-cloudfront-cert"
    Environment = var.environment
  }

  lifecycle {
    create_before_destroy = true
  }
}

############################################
# ACM Certificate Validation via Route53
############################################
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cloudfront.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = aws_route53_zone.root.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "cloudfront" {
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.cloudfront.arn
  validation_record_fqdns = [
    for record in aws_route53_record.cert_validation : record.fqdn
  ]

  timeouts {
    create = "5m"
  }
}

