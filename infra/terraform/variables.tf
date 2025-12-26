variable "environment" {
  type = string
}

variable "worker_image" {
  type = string
}

variable "cloudfront_public_key" {
  type        = string
  default     = ""
  description = "CloudFront public key for signed URLs. Leave empty to disable key groups."
}

variable "cloudfront_private_key" {
  type        = string
  default     = ""
  sensitive   = true
  description = "CloudFront private key for signed URLs. Leave empty to disable signed URLs."
}
