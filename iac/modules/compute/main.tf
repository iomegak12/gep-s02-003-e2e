locals {
  compose_b64 = base64encode(file(var.compose_file_path))
}

data "cloudinit_config" "vm" {
  gzip          = true
  base64_encode = true

  part {
    content_type = "text/cloud-config"
    filename     = "gep-bootstrap.yaml"
    content = templatefile(var.cloud_init_template_path, {
      compose_b64    = local.compose_b64
      admin_username = var.admin_username
    })
  }
}

resource "azurerm_network_interface" "nic" {
  name                = "nic-${var.name_base}"
  location            = var.location
  resource_group_name = var.resource_group_name
  tags                = var.tags

  ip_configuration {
    name                          = "ipcfg"
    subnet_id                     = var.subnet_id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = var.public_ip_id
  }
}

resource "azurerm_network_interface_security_group_association" "nic_nsg" {
  network_interface_id      = azurerm_network_interface.nic.id
  network_security_group_id = var.nsg_id
}

resource "azurerm_linux_virtual_machine" "vm" {
  name                            = "vm-${var.name_base}"
  resource_group_name             = var.resource_group_name
  location                        = var.location
  size                            = var.vm_size
  admin_username                  = var.admin_username
  disable_password_authentication = true
  network_interface_ids           = [azurerm_network_interface.nic.id]
  tags                            = var.tags

  admin_ssh_key {
    username   = var.admin_username
    public_key = var.ssh_public_key_openssh
  }

  os_disk {
    name                 = "osdisk-${var.name_base}"
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
    disk_size_gb         = var.os_disk_size_gb
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  custom_data = data.cloudinit_config.vm.rendered

  depends_on = [
    azurerm_network_interface_security_group_association.nic_nsg
  ]
}
