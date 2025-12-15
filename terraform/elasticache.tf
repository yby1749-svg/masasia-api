# ElastiCache Redis

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name        = "${local.name_prefix}-redis-subnet"
  description = "Redis subnet group"
  subnet_ids  = aws_subnet.private[*].id

  tags = {
    Name = "${local.name_prefix}-redis-subnet"
  }
}

# ElastiCache Redis Cluster
resource "aws_elasticache_cluster" "main" {
  cluster_id           = "${local.name_prefix}-redis"
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = var.redis_node_type
  num_cache_nodes      = 1
  port                 = 6379
  parameter_group_name = "default.redis7"

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  # Maintenance
  maintenance_window = "sun:05:00-sun:06:00"

  # Snapshots (not available for cache.t3.micro)
  snapshot_retention_limit = 0

  tags = {
    Name = "${local.name_prefix}-redis"
  }
}

# Store Redis URL in Parameter Store
resource "aws_ssm_parameter" "redis_url" {
  name        = "/masasia/${var.environment}/REDIS_URL"
  description = "Redis connection URL"
  type        = "SecureString"
  value       = "redis://${aws_elasticache_cluster.main.cache_nodes[0].address}:${aws_elasticache_cluster.main.cache_nodes[0].port}"

  tags = {
    Name = "${local.name_prefix}-redis-url"
  }
}
