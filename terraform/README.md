# Terraform Infrastructure

This directory contains Terraform configurations for deploying MASASIA API to AWS.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           AWS Cloud                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                         VPC                              │   │
│  │  ┌─────────────────┐     ┌─────────────────┐           │   │
│  │  │  Public Subnet  │     │  Public Subnet  │           │   │
│  │  │  (AZ-1)         │     │  (AZ-2)         │           │   │
│  │  │                 │     │                 │           │   │
│  │  │  ┌───────────┐  │     │  ┌───────────┐  │           │   │
│  │  │  │    ALB    │◄─┼─────┼──│    ALB    │  │           │   │
│  │  │  └─────┬─────┘  │     │  └───────────┘  │           │   │
│  │  │        │        │     │                 │           │   │
│  │  │  ┌─────▼─────┐  │     │                 │           │   │
│  │  │  │    NAT    │  │     │                 │           │   │
│  │  │  └─────┬─────┘  │     │                 │           │   │
│  │  └────────┼────────┘     └─────────────────┘           │   │
│  │           │                                             │   │
│  │  ┌────────▼────────┐     ┌─────────────────┐           │   │
│  │  │ Private Subnet  │     │ Private Subnet  │           │   │
│  │  │ (AZ-1)          │     │ (AZ-2)          │           │   │
│  │  │                 │     │                 │           │   │
│  │  │ ┌─────────────┐ │     │ ┌─────────────┐ │           │   │
│  │  │ │ ECS Fargate │ │     │ │ ECS Fargate │ │           │   │
│  │  │ │  (Task)     │ │     │ │  (Task)     │ │           │   │
│  │  │ └──────┬──────┘ │     │ └─────────────┘ │           │   │
│  │  │        │        │     │                 │           │   │
│  │  │ ┌──────▼──────┐ │     │ ┌─────────────┐ │           │   │
│  │  │ │     RDS     │ │     │ │    Redis    │ │           │   │
│  │  │ │ PostgreSQL  │ │     │ │ ElastiCache │ │           │   │
│  │  │ └─────────────┘ │     │ └─────────────┘ │           │   │
│  │  └─────────────────┘     └─────────────────┘           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   ECR    │  │   SSM    │  │CloudWatch│  │   IAM    │       │
│  │Repository│  │Parameters│  │  Logs    │  │  Roles   │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- [Terraform](https://www.terraform.io/downloads) >= 1.0
- [AWS CLI](https://aws.amazon.com/cli/) configured with credentials
- AWS account with appropriate permissions

## Quick Start

### 1. Configure Variables

```bash
# Copy example variables file
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
vim terraform.tfvars
```

### 2. Initialize Terraform

```bash
terraform init
```

### 3. Review Plan

```bash
terraform plan
```

### 4. Apply Infrastructure

```bash
terraform apply
```

### 5. Deploy Application

After infrastructure is created:

```bash
# Login to ECR
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com

# Build and push image
docker build -t masasia-api ./apps/api
docker tag masasia-api:latest <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com/masasia-api:latest
docker push <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com/masasia-api:latest

# Force new deployment
aws ecs update-service --cluster masasia-prod-cluster --service masasia-prod-service --force-new-deployment
```

## Files

| File | Description |
|------|-------------|
| `main.tf` | Provider configuration and locals |
| `variables.tf` | Input variable definitions |
| `vpc.tf` | VPC, subnets, NAT gateway |
| `security-groups.tf` | Security groups for all resources |
| `rds.tf` | PostgreSQL RDS instance |
| `elasticache.tf` | Redis ElastiCache cluster |
| `ecr.tf` | ECR repository |
| `iam.tf` | IAM roles and policies |
| `ecs.tf` | ECS cluster, task definition, service |
| `alb.tf` | Application Load Balancer |
| `cloudwatch.tf` | CloudWatch logs and alarms |
| `outputs.tf` | Output values |

## Resources Created

### Networking
- VPC with DNS support
- 2 public subnets (for ALB)
- 2 private subnets (for ECS, RDS, Redis)
- Internet Gateway
- NAT Gateway
- Route tables

### Compute
- ECS Fargate cluster
- ECS service with auto-scaling
- Application Load Balancer

### Database
- RDS PostgreSQL 15
- ElastiCache Redis 7

### Security
- Security groups for ALB, ECS, RDS, Redis
- IAM roles for ECS tasks
- SSM Parameter Store for secrets

### Monitoring
- CloudWatch log group
- CloudWatch alarms (CPU, memory, storage, errors)

## Cost Estimation

| Resource | Type | Monthly Cost |
|----------|------|--------------|
| ECS Fargate | 0.25 vCPU, 0.5GB | ~$10 |
| RDS PostgreSQL | db.t3.micro | ~$15 |
| ElastiCache Redis | cache.t3.micro | ~$12 |
| ALB | 1 LCU | ~$20 |
| NAT Gateway | 1 | ~$32 |
| CloudWatch | Logs | ~$5 |
| **Total** | | **~$94/month** |

## Environment Configuration

### Production
```hcl
environment       = "prod"
ecs_desired_count = 2
db_instance_class = "db.t3.small"
```

### Staging
```hcl
environment       = "staging"
ecs_desired_count = 1
db_instance_class = "db.t3.micro"
```

## SSL/HTTPS Setup

1. Set domain variables:
```hcl
domain_name       = "api.masasia.com"
create_dns_record = true
route53_zone_id   = "Z1234567890ABC"
```

2. Apply terraform (ACM certificate will be created)
3. Wait for DNS validation to complete
4. HTTPS listener will be automatically configured

## Destroying Infrastructure

```bash
# Review what will be destroyed
terraform plan -destroy

# Destroy (type 'yes' to confirm)
terraform destroy
```

**Warning**: This will delete all resources including the database. Make sure to backup data first.

## Troubleshooting

### ECS tasks not starting
- Check CloudWatch logs: `/ecs/masasia-prod`
- Verify ECR image exists
- Check security group rules

### Database connection issues
- Verify security group allows ECS → RDS on port 5432
- Check SSM parameter values
- Ensure RDS is in private subnet

### ALB health check failing
- Verify `/health` endpoint returns 200
- Check ECS task logs
- Confirm container port matches target group

## State Management

For team usage, configure S3 backend:

```hcl
terraform {
  backend "s3" {
    bucket         = "masasia-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "ap-southeast-1"
    encrypt        = true
    dynamodb_table = "masasia-terraform-locks"
  }
}
```

Create the S3 bucket and DynamoDB table before using this backend.
