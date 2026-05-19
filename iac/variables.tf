variable "project" {
  description = "Short project name used in resource naming."
  type        = string
  default     = "gep003"
}

variable "location" {
  description = "Azure region for all resources."
  type        = string
  default     = "westus"
}

variable "vm_size" {
  description = "Azure VM SKU (4 vCPU / 16 GB RAM)."
  type        = string
  default     = "Standard_D4s_v5"
}

variable "admin_username" {
  description = "Linux admin user for the VM."
  type        = string
  default     = "azureuser"
}

variable "os_disk_size_gb" {
  description = "OS disk size in GB."
  type        = number
  default     = 64
}

variable "tags" {
  description = "Common resource tags."
  type        = map(string)
  default = {
    project     = "gep-003-e2e"
    environment = "demo"
    managed_by  = "terraform"
  }
}
