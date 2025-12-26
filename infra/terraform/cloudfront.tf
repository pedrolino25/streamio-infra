############################################
# Origin Access Identity (S3 protection)
############################################
resource "aws_cloudfront_origin_access_identity" "oai" {
  comment = "OAI for processed video bucket"
}

############################################
# Optional CloudFront Public Key
############################################
resource "aws_cloudfront_public_key" "public_key" {
  count       = var.cloudfront_public_key != "" ? 1 : 0
  name        = "video-signing-key"
  encoded_key = var.cloudfront_public_key
  comment     = "Public key for signed cookies"
}

############################################
# Optional CloudFront Key Group
############################################
resource "aws_cloudfront_key_group" "key_group" {
  count = var.cloudfront_public_key != "" ? 1 : 0
  name  = "video-key-group"

  items = [
    aws_cloudfront_public_key.public_key[0].id
  ]
}

############################################
# CloudFront Distribution
############################################
resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  comment             = "Protected HLS distribution"
  default_root_object = ""

  ##########################################
  # Origin (S3)
  ##########################################
  origin {
    domain_name = aws_s3_bucket.processed.bucket_regional_domain_name
    origin_id   = "processed"

    s3_origin_config {
      origin_access_identity =
        aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  ##########################################
  # Default Cache Behavior (SIGNED COOKIES)
  ##########################################
  default_cache_behavior {
    target_origin_id       = "processed"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["GET", "HEAD"]
    cached_methods  = ["GET", "HEAD"]

    compress = true

    # 🔐 Enforce signed requests
    trusted_key_groups = var.cloudfront_public_key != ""
      ? [aws_cloudfront_key_group.key_group[0].id]
      : []

    # 🔑 REQUIRED for signed cookies
    forwarded_values {
      query_string = true

      cookies {
        forward = "all"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  ##########################################
  # Restrictions
  ##########################################
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  ##########################################
  # Viewer Certificate
  ##########################################
  viewer_certificate {
    cloudfront_default_certificate = true
  }

  ##########################################
  # Ensure key group exists first
  ##########################################
  depends_on = var.cloudfront_public_key != ""
    ? [aws_cloudfront_key_group.key_group]
    : []
}
