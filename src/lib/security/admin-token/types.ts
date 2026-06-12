export type AdminAuthMetadata = {
  mode: string;
  source: string;
  configured: boolean;
  file_path?: string | null;
  rotate_on_start?: boolean;
  rotation_supported?: boolean;
};

export type AdminTokenStatusResponse = {
  ok: boolean;
  request_id?: string | null;
  admin_auth_metadata?: AdminAuthMetadata;
};

export type AdminTokenRotateResponse = {
  ok: boolean;
  request_id?: string | null;
  rotated?: boolean;
  changed_fields?: string[];
  admin_auth_metadata?: AdminAuthMetadata;
};
