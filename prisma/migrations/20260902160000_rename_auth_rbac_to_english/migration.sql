-- Preserve auth/RBAC rows while translating physical table and column names.
ALTER TABLE `user_peran`
  DROP FOREIGN KEY `user_peran_user_id_fkey`,
  DROP FOREIGN KEY `user_peran_peran_id_fkey`,
  CHANGE `peran_id` `role_id` INTEGER NOT NULL;

ALTER TABLE `menu_peran`
  DROP FOREIGN KEY `menu_peran_menu_id_fkey`,
  DROP FOREIGN KEY `menu_peran_peran_id_fkey`,
  CHANGE `peran_id` `role_id` INTEGER NOT NULL;

ALTER TABLE `peran`
  CHANGE `nama` `name` VARCHAR(120) NOT NULL,
  CHANGE `deskripsi` `description` VARCHAR(255) NULL,
  RENAME INDEX `peran_key_key` TO `roles_key_key`;

ALTER TABLE `menu`
  CHANGE `urutan` `order` INTEGER NOT NULL DEFAULT 0,
  RENAME INDEX `menu_key_key` TO `menu_items_key_key`;

RENAME TABLE
  `peran` TO `roles`,
  `user_peran` TO `user_roles`,
  `menu` TO `menu_items`,
  `menu_peran` TO `menu_roles`;

ALTER TABLE `user_roles`
  ADD CONSTRAINT `user_roles_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `user_roles_role_id_fkey`
    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `menu_roles`
  ADD CONSTRAINT `menu_roles_menu_id_fkey`
    FOREIGN KEY (`menu_id`) REFERENCES `menu_items`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `menu_roles_role_id_fkey`
    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
