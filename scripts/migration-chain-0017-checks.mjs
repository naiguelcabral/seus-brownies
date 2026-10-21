// Synthetic fixtures only; the caller supplies the disposable PostgreSQL client.
import assert from 'node:assert/strict'

const references = {
  stock_movement: `INSERT INTO stock_movements (product_id,type,quantity_delta,unit_cost)
    VALUES ($1,'adjustment',1.125,2.35)`,
  purchase_item: `WITH parent AS (
      INSERT INTO purchases (purchased_at,total_amount) VALUES ('2026-01-02',2.35) RETURNING id
    ) INSERT INTO purchase_items (purchase_id,product_id,item_name,quantity,unit_cost,total_amount)
    SELECT id,$1,'Synthetic item',1,2.35,2.35 FROM parent`,
  sale_item: `WITH parent AS (
      INSERT INTO sales (subtotal_amount,total_amount) VALUES (2.35,2.35) RETURNING id
    ) INSERT INTO sale_items (sale_id,product_id,product_name,quantity,unit_price,total_amount)
    SELECT id,$1,'Synthetic item',1,2.35,2.35 FROM parent`,
  import_alias: `INSERT INTO product_import_aliases
    (source_id,source_name,normalized_source_name,product_id,source_unit,quantity_multiplier)
    VALUES ('synthetic-alias','Synthetic alias','synthetic alias',$1,'g',1)`,
  recipe_item: `INSERT INTO recipe_items
    (source_key,source_hash,recipe_version_id,product_id,source_name,quantity,unit,source_payload)
    VALUES ('synthetic-item','synthetic-item',-1,$1,'Synthetic ingredient',1,'g','{}')`,
  profile_product: `INSERT INTO production_profiles
    (source_id,source_hash,recipe_version_id,product_id,expected_yield,source_payload)
    VALUES ('synthetic-target-profile','synthetic-target-profile',-1,$1,1,'{}')`,
  profile_packaging: `UPDATE production_profiles SET packaging_product_id=$1 WHERE id=-1`,
  profile_component: `INSERT INTO production_profile_components
    (source_id,source_hash,production_profile_id,product_id,role,quantity,unit,source_payload)
    VALUES ('synthetic-component','synthetic-component',-1,$1,'filling',1,'g','{}')`,
  batch_output: `WITH parent AS (
      INSERT INTO production_batches DEFAULT VALUES RETURNING id
    ) INSERT INTO production_batch_outputs (production_batch_id,product_id,actual_quantity)
    SELECT id,$1,1 FROM parent`,
}

async function expectStructureRejection(client, assignment, productId) {
  // A rejected statement aborts the transaction; retain the reference fixture
  // while recovering from each deliberate error with a nested savepoint.
  await client.query('SAVEPOINT rejected_structure_update')
  let state
  try {
    await client.query(`UPDATE products SET ${assignment} WHERE id=$1`, [
      productId,
    ])
  } catch (error) {
    state = error.code
  } finally {
    await client.query('ROLLBACK TO SAVEPOINT rejected_structure_update')
    await client.query('RELEASE SAVEPOINT rejected_structure_update')
  }
  assert.equal(state, '23514', assignment)
}

export async function verify0017ProductGuards(client) {
  const checked = []
  for (const [name, referenceSql] of Object.entries(references)) {
    await client.query('BEGIN')
    try {
      const target = (
        await client.query(`INSERT INTO products
          (sku,name,product_type,measurement_unit)
          VALUES ('SYNTH-GUARD-TARGET','Synthetic target','ingredient','g') RETURNING id`)
      ).rows[0].id
      const other = (
        await client.query(`INSERT INTO products
          (sku,name,product_type,measurement_unit)
          VALUES ('SYNTH-GUARD-OTHER','Synthetic other','finished_product','unit') RETURNING id`)
      ).rows[0].id
      // Explicit fixture IDs are local to this rolled-back, synthetic case.
      await client.query(`INSERT INTO recipe_versions
        (id,source_id,source_hash,name,version,source_payload)
        VALUES (-1,'synthetic-recipe','synthetic-recipe','Synthetic recipe',1,'{}')`)
      await client.query(
        `INSERT INTO production_profiles
        (id,source_id,source_hash,recipe_version_id,product_id,expected_yield,source_payload)
        VALUES (-1,'synthetic-profile','synthetic-profile',-1,$1,1,'{}')`,
        [other],
      )
      await client.query(referenceSql, [target])
      const before = (
        await client.query('SELECT * FROM products WHERE id=$1', [target])
      ).rows
      await expectStructureRejection(client, "measurement_unit='kg'", target)
      await expectStructureRejection(
        client,
        "product_type='finished_product'",
        target,
      )
      await expectStructureRejection(
        client,
        "product_type='finished_product',measurement_unit='unit'",
        target,
      )
      assert.deepEqual(
        (await client.query('SELECT * FROM products WHERE id=$1', [target]))
          .rows,
        before,
      )
      // UPDATE OF also fires when the listed columns keep their old values.
      // The IS DISTINCT FROM guard must permit this legitimate no-op.
      await client.query(
        `UPDATE products SET
        product_type=product_type,measurement_unit=measurement_unit WHERE id=$1`,
        [target],
      )
      await client.query(
        "UPDATE products SET name='Renamed synthetic target' WHERE id=$1",
        [target],
      )
      checked.push(name)
    } finally {
      await client.query('ROLLBACK')
    }
  }
  await client.query('BEGIN')
  try {
    const id = (
      await client.query(`INSERT INTO products (sku,name,product_type,measurement_unit)
        VALUES ('SYNTH-UNUSED-GUARD','Synthetic unused','ingredient','g') RETURNING id`)
    ).rows[0].id
    await client.query(
      `UPDATE products SET
      product_type='finished_product',measurement_unit='unit' WHERE id=$1`,
      [id],
    )
    assert.deepEqual(
      (
        await client.query(
          'SELECT product_type,measurement_unit FROM products WHERE id=$1',
          [id],
        )
      ).rows,
      [{ product_type: 'finished_product', measurement_unit: 'unit' }],
    )
    checked.push('unused_product_remains_editable')
  } finally {
    await client.query('ROLLBACK')
  }
  return checked
}

export async function verify0017Idempotency(client) {
  // Nullable legacy keys are preserved; non-null duplicates must be rejected
  // independently for all three tables touched by 0017.
  const checked = []
  for (const [table, insert] of Object.entries({
    expenses: `INSERT INTO expenses (description,category,amount,occurred_at,idempotency_key)
      VALUES ('Synthetic expense','fixture',1.23,'2026-01-02',$1)`,
    purchases: `INSERT INTO purchases (purchased_at,total_amount,idempotency_key)
      VALUES ('2026-01-02',1.23,$1)`,
    sales: `INSERT INTO sales (subtotal_amount,total_amount,idempotency_key)
      VALUES (1.23,1.23,$1)`,
  })) {
    await client.query('BEGIN')
    try {
      await client.query(insert, [null])
      await client.query(insert, [null])
      await client.query(insert, ['synthetic-0017-key'])
      await client.query('SAVEPOINT duplicate_key')
      let state
      try {
        await client.query(insert, ['synthetic-0017-key'])
      } catch (error) {
        state = error.code
      } finally {
        await client.query('ROLLBACK TO SAVEPOINT duplicate_key')
      }
      assert.equal(state, '23505', table)
      checked.push(table)
    } finally {
      await client.query('ROLLBACK')
    }
  }
  return checked
}
