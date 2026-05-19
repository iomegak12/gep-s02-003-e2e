data "http" "myip" {
  url = "https://api.ipify.org"
}

resource "random_string" "suffix" {
  length  = 5
  upper   = false
  numeric = true
  special = false
}

locals {
  name_base  = "${var.project}-${random_string.suffix.result}"
  my_ip_cidr = "${chomp(data.http.myip.response_body)}/32"

  public_tcp_ports = {
    web_http       = { port = "8080", priority = 1010 }
    iam_api        = { port = "3001", priority = 1020 }
    supplier_api   = { port = "3002", priority = 1030 }
    po_api         = { port = "3003", priority = 1040 }
    cloudbeaver_ui = { port = "8978", priority = 1050 }
    mongo_express  = { port = "8081", priority = 1060 }
  }
}

resource "azurerm_resource_group" "rg" {
  name     = "rg-${local.name_base}-${var.location}"
  location = var.location
  tags     = var.tags
}

module "ssh" {
  source = "./modules/ssh"

  key_dir = "${path.module}/keys"
}

module "networking" {
  source = "./modules/networking"

  name_base           = local.name_base
  location            = var.location
  resource_group_name = azurerm_resource_group.rg.name
  ssh_source_cidr     = local.my_ip_cidr
  public_tcp_ports    = local.public_tcp_ports
  tags                = var.tags
}

module "compute" {
  source = "./modules/compute"

  name_base                = local.name_base
  location                 = var.location
  resource_group_name      = azurerm_resource_group.rg.name
  subnet_id                = module.networking.subnet_id
  public_ip_id             = module.networking.public_ip_id
  nsg_id                   = module.networking.nsg_id
  vm_size                  = var.vm_size
  admin_username           = var.admin_username
  ssh_public_key_openssh   = module.ssh.public_key_openssh
  os_disk_size_gb          = var.os_disk_size_gb
  compose_file_path        = "${path.module}/../docker-compose.prod.yml"
  cloud_init_template_path = "${path.module}/modules/compute/cloud-init.yaml.tftpl"
  tags                     = var.tags
}
