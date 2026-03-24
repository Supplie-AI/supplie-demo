variable "aws_region" {
  default = "us-east-1"
}

variable "cluster_name" {
  default = "supplie-demo"
}

variable "cluster_version" {
  default = "1.31"
}

variable "node_instance_type" {
  default = "t3.medium"
}

variable "node_count" {
  default = 2
}

variable "environment" {
  default = "demo"
}
