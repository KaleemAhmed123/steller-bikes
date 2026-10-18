import { test } from 'node:test';
import assert from 'node:assert/strict';
import { can } from '../src/lib/permissions.js';

test('owner can do the step-5 actions', () => {
  assert.equal(can('owner', 'orders.update'), true);
  assert.equal(can('owner', 'inventory.adjust'), true);
  assert.equal(can('owner', 'dashboard.read'), true);
});

test('manager can work orders + inventory + dashboard', () => {
  assert.equal(can('manager', 'orders.read'), true);
  assert.equal(can('manager', 'orders.update'), true);
  assert.equal(can('manager', 'inventory.read'), true);
  assert.equal(can('manager', 'inventory.adjust'), true);
  assert.equal(can('manager', 'dashboard.read'), true);
});

test('both roles manage products; only the owner manages settings', () => {
  assert.equal(can('manager', 'products.manage'), true);
  assert.equal(can('owner', 'products.manage'), true);
  assert.equal(can('owner', 'settings.manage'), true);
  assert.equal(can('manager', 'settings.manage'), false);
});
