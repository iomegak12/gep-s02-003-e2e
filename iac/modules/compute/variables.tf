variable "name_base" {
  description = "Base name used in resource naming."
  type        = string
}

variable "location" {
  description = "Azure region."
  type        = string
}

variable "resource_group_name" {
  description = "Resource group to place compute resources in."
  type        = string
}

variable "subnet_id" {
  description = "Subnet ID for the VM NIC."
  type        = string
}

variable "public_ip_id" {
  description = "Public IP ID to associate with the NIC."
  type        = string
}

variable "nsg_id" {
  description = "NSG ID to associate with the NIC."
  type        = string
}

variable "vm_size" {
  description = "Azure VM size SKU."
  type        = string
}

variable "admin_username" {
  description = "Linux admin user."
  type        = string
}

variable "ssh_public_key_openssh" {
  description = "OpenSSH-formatted public key authorized for the admin user."
  type        = string
}

variable "os_disk_size_gb" {
  description = "OS disk size in GB."
  type        = number
  default     = 64
}

variable "compose_file_path" {
  description = "Absolute path (from the root module) to the docker-compose file to embed into cloud-init."
  type        = string
}

variable "cloud_init_template_path" {
  description = "Path to the cloud-init template file."
  type        = string
}

variable "tags" {
  description = "Common resource tags."
  type        = map(string)
  default     = {}
}
