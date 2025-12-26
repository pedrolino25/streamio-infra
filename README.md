# 📽️ Streamio - Media Processing Platform

**Secure Upload → Automatic Processing → Protected Playback**

A serverless, multi-tenant media processing platform built on AWS that enables secure video upload, automatic FFmpeg processing, and protected playback delivery via CloudFront.

---

## 📌 Overview

This platform enables multiple projects to:

1. **Securely upload videos** via presigned S3 URLs
2. **Automatic processing** with FFmpeg on ECS
3. **Protected delivery** via CloudFront with signed URLs

### Key Features

- ✅ **No direct S3 access** - All operations go through secure APIs
- ✅ **On-demand processing** - Scales to zero when idle
- ✅ **Cost-effective** - Pay only for active processing
- ✅ **Multi-tenant isolation** - Fully isolated per project
- ✅ **Event-driven** - Automatic processing triggered by S3 events
- ✅ **Secure by default** - Zero-trust security model

---

## 🏗️ Architecture

```
┌─────────┐
│ Client  │
└────┬────┘
     │ API Key
     ▼
┌─────────────────┐
│  API Gateway    │
│                 │
│  POST /upload-url    → Presigned S3 PUT
│  POST /playback-url  → CloudFront Signed URL
└────┬────────────────┘
     │
     ▼
┌─────────────────┐
│   DynamoDB      │
│  (projects)     │
└─────────────────┘

┌─────────────┐
│  S3 RAW     │
└──────┬──────┘
       │ ObjectCreated Event
       ▼
┌─────────────────┐
│ Lambda          │
│ Dispatcher      │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  ECS RunTask    │
│  (FFmpeg Worker)│
│                 │
│  • Download RAW │
│  • Process video│
│  • Upload PROC  │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  CloudFront     │
└──────┬──────────┘
       │
       ▼
┌──────────┐
│  Client  │
│(Playback)│
└──────────┘
```

---

## 🧩 Components

| Component             | Description                                      |
| --------------------- | ------------------------------------------------ |
| **API Gateway**       | API Key authentication and request routing       |
| **Lambda Upload**     | Generates presigned S3 URLs for secure uploads   |
| **Lambda Dispatcher** | Triggers automatic processing on S3 events       |
| **ECS RunTask**       | FFmpeg worker (scales to zero)                   |
| **S3 RAW**            | Private bucket for initial video uploads         |
| **S3 PROCESSED**      | Private bucket for processed videos              |
| **CloudFront**        | CDN with signed URLs for secure playback         |
| **DynamoDB**          | Project/tenant management and API key resolution |
| **CloudWatch**        | Logs and observability                           |

---

## 🔐 Security Model

- Each client receives a unique **API Key** that resolves to a project in DynamoDB
- **Upload**: Only via presigned S3 URLs (no direct S3 access)
- **Playback**: Only via CloudFront Signed URLs with expiration timestamps
- All S3 paths are automatically prefixed with `projects/{project_id}/`

---

## 📡 API Reference

### Upload Video

Generate a presigned URL for video upload.

**Endpoint:** `POST /upload-url`

**Headers:**

```
x-api-key: YOUR_API_KEY
```

**Request Body:**

```json
{
  "filename": "video.mp4",
  "path": "uploads/2025/event/"
}
```

**Response:**

```json
{
  "uploadUrl": "https://s3-presigned-url...",
  "s3Key": "projects/project123/uploads/2025/event/video.mp4"
}
```

**Next Step:** Client performs `PUT` directly to `uploadUrl` with the video file.

---

### Get Playback URL

Get a signed CloudFront URL for video playback.

**Endpoint:** `POST /playback-url`

**Headers:**

```
x-api-key: YOUR_API_KEY
```

**Query Parameters:**

```
key=processed/project123/uploads/2025/event/video.mp4
```

**Response:**

```json
{
  "signedUrl": "https://cloudfront.net/processed/project123/uploads/2025/event/video.mp4?Expires=...&Signature=...&Key-Pair-Id=..."
}
```

---

### Processing Flow

1. Video uploaded to S3 RAW bucket
2. S3 event triggers Lambda Dispatcher
3. Dispatcher starts ECS task for processing
4. Worker downloads, processes, and uploads to PROCESSED bucket
5. Processed video available via CloudFront signed URLs

---

## 🚀 Deployment

### Prerequisites

Before deploying, you need to set up:

1. **S3 bucket for Terraform state**
2. **DynamoDB table for Terraform locks**
3. **CloudFront key pair** (RSA private/public keys)
4. **AWS credentials** configured

#### Setting Up Terraform State

Create the S3 bucket and DynamoDB table for Terraform state management:

```bash
# Set your AWS region and bucket name
export AWS_REGION=us-east-1
export TF_STATE_BUCKET=your-terraform-state-bucket
export TF_LOCK_TABLE=terraform-locks

# Create S3 bucket for Terraform state
aws s3api create-bucket \
  --bucket $TF_STATE_BUCKET \
  --region $AWS_REGION \
  --create-bucket-configuration LocationConstraint=$AWS_REGION

# Enable versioning on the bucket
aws s3api put-bucket-versioning \
  --bucket $TF_STATE_BUCKET \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name $TF_LOCK_TABLE \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region $AWS_REGION
```

**Note:** Update the `backend.tf` file in `infra/terraform/` to use your bucket name and region.

### GitHub Secrets

For automatic deployment, configure these secrets in your GitHub repository:

- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `CLOUDFRONT_PUBLIC_KEY` - CloudFront public key (PEM format)
- `CLOUDFRONT_PRIVATE_KEY` - CloudFront private key (PEM format)

### Automatic Deployment

The platform supports automatic deployment via GitHub Actions:

- **`dev` branch** → Deploys to **DEV** environment
- **`main` branch** → Deploys to **PROD** environment

### Manual Deployment

```bash
# Navigate to Terraform directory
cd infra/terraform

# Initialize Terraform
terraform init

# Review changes
terraform plan

# Apply changes
terraform apply
```

---

## 🧱 Design Principles

- **Event-driven** - Processing triggered by S3 events
- **Stateless** - No shared state between requests
- **Scale-to-zero** - Zero cost when idle
- **Multi-tenant** - Complete isolation per project
- **Infrastructure as Code** - All infrastructure defined in Terraform
- **Zero trust** - No direct access to resources, all via secure APIs

---

## ✅ Use Cases

This platform is ready for:

- 🎬 **Video SaaS** - White-label video processing services
- 📱 **UGC Platforms** - User-generated content processing
- 🎓 **E-learning** - Educational video delivery
- 🔄 **Media Pipelines** - Automated video transformation workflows
- 🏢 **Enterprise** - Secure internal video processing

**Benefits:** Low cost, high security, and automatic scaling.
