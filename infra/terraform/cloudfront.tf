############################################
# Origin Access Identity (S3 protection)
############################################
resource "aws_cloudfront_origin_access_identity" "oai" {
  comment = "OAI for processed video bucket"
}

############################################
# Response Headers Policy (CORS)
############################################
resource "aws_cloudfront_response_headers_policy" "cors" {
  name = "cors-headers-policy"

  cors_config {
    access_control_allow_credentials = false

    access_control_allow_headers {
      items = ["*"]
    }

    access_control_allow_methods {
      items = ["GET", "HEAD", "OPTIONS"]
    }

    access_control_allow_origins {
      items = ["*"]
    }

    access_control_expose_headers {
      items = ["Content-Length", "Content-Type", "Content-Range", "Accept-Ranges"]
    }

    access_control_max_age_sec = 3600

    origin_override = true
  }
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
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  ##########################################
  # Default Cache Behavior (SIGNED COOKIES)
  ##########################################
  default_cache_behavior {
    target_origin_id       = "processed"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods  = ["GET", "HEAD"]

    compress = true

    # 🔐 Enforce signed requests
    trusted_key_groups = local.cloudfront_trusted_key_groups

    # 🌐 CORS headers
    response_headers_policy_id = aws_cloudfront_response_headers_policy.cors.id

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

}
