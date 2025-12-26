terraform {
  backend "s3" {
    bucket         = "streamio-terraform-state"
    key            = "dev/terraform.tfstate" # sobrescrito no init do pipeline
    region         = "eu-west-2"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
