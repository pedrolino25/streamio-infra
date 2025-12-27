############################################
# Origin Access Control (OAC) for S3 protection
# OAC is the modern replacement for OAI
############################################
resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${local.project_name}-${var.environment}-oac"
  description                       = "OAC for processed video bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

############################################
# Response Headers Policy (CORS)
############################################
resource "aws_cloudfront_response_headers_policy" "cors" {
  name = "cors-headers-policy-${var.environment}"

  cors_config {
    # CloudFront signed cookies are domain-scoped, so they work without CORS credentials
    # Setting credentials=false allows wildcard origins, which is needed for public video streaming
    # Cookies are automatically sent by browser to CloudFront domain regardless of CORS settings
    access_control_allow_credentials = length(var.cloudfront_cors_origins) > 0

    # When credentials=true, cannot use "*" - must specify explicit headers
    # When credentials=false (default), can use wildcard
    access_control_allow_headers {
      items = length(var.cloudfront_cors_origins) > 0 ? [
        "Accept",
        "Accept-Language",
        "Content-Type",
        "Range",
        "Origin",
        "Referer",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers"
      ] : ["*"]
    }

    access_control_allow_methods {
      items = ["GET", "HEAD", "OPTIONS"]
    }

    # Use explicit origins if provided (requires credentials=true), otherwise wildcard (credentials=false)
    access_control_allow_origins {
      items = length(var.cloudfront_cors_origins) > 0 ? var.cloudfront_cors_origins : ["*"]
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
  # Origin (S3) with OAC
  ##########################################
  origin {
    domain_name              = aws_s3_bucket.processed.bucket_regional_domain_name
    origin_id                = "processed"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  ##########################################
  # Default Cache Behavior (SIGNED COOKIES)
  # Optimized for HLS streaming (.m3u8, .ts, .m4s)
  ##########################################
  default_cache_behavior {
    target_origin_id       = "processed"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods  = ["GET", "HEAD"]

    compress = true

    # 🔐 Enforce signed requests via trusted key groups
    trusted_key_groups = local.cloudfront_trusted_key_groups

    # 🌐 CORS headers for cross-origin video playback
    response_headers_policy_id = aws_cloudfront_response_headers_policy.cors.id

    # 🔑 REQUIRED for signed cookies - forward all cookies to origin
    # This ensures CloudFront validates the signed cookies on each request
    forwarded_values {
      query_string = true

      cookies {
        forward = "all"
      }
    }

    # Cache settings optimized for HLS:
    # - min_ttl=0: Allow no-cache headers from origin
    # - default_ttl: Short for manifest files, longer for segments (handled by origin headers)
    # - max_ttl: Maximum cache time for video segments
    min_ttl     = 0
    default_ttl = 86400    # 24 hours for video segments (optimize CDN performance)
    max_ttl     = 31536000 # 1 year (maximum allowed)
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
