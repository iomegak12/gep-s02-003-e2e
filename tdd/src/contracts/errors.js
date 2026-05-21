export class InventoryError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'InventoryError';
    this.code = code;
  }
}

export class ValidationError extends InventoryError {
  constructor(message) {
    super(message, 'E_VALIDATION');
    this.name = 'ValidationError';
  }
}

export class ItemNotFoundError extends InventoryError {
  constructor(id) {
    super(`Inventory item not found: ${id}`, 'E_NOT_FOUND');
    this.name = 'ItemNotFoundError';
    this.id = id;
  }
}

export class DuplicateItemError extends InventoryError {
  constructor(field, value) {
    super(`Duplicate inventory item (${field}=${value})`, 'E_DUPLICATE');
    this.name = 'DuplicateItemError';
    this.field = field;
    this.value = value;
  }
}

export class NotImplementedError extends InventoryError {
  constructor(method) {
    super(`Method not implemented: ${method}`, 'E_NOT_IMPLEMENTED');
    this.name = 'NotImplementedError';
    this.method = method;
  }
}
