resource "aws_cloudfront_origin_access_identity" "oai" {}

resource "aws_cloudfront_distribution" "cdn" {
  enabled = true

  origin {
    domain_name = aws_s3_bucket.processed.bucket_regional_domain_name
    origin_id   = "processed"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    target_origin_id       = "processed"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]

    # Only use key groups if they are created
    # When trusted_key_groups is set, ALL requests must be signed with a valid key pair ID
    trusted_key_groups = var.cloudfront_public_key != "" ? [aws_cloudfront_key_group.key_group[0].id] : []

    forwarded_values {
      query_string = true
      cookies { forward = "none" }
    }
  }

  # Ensure key group is created before distribution if using signed URLs
  depends_on = var.cloudfront_public_key != "" ? [aws_cloudfront_key_group.key_group] : []

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
