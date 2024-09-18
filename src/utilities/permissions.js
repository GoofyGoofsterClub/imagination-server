export const USER_PERMISSIONS = {};

// START -- Define user permissions
USER_PERMISSIONS.UPLOAD = 1;
USER_PERMISSIONS.VIEW_OWN_FILES = 2;
USER_PERMISSIONS.CHANGE_DISPLAY_NAME = 4;
USER_PERMISSIONS.ADMINSITRATOR = 8;
USER_PERMISSIONS.INVITE_USERS = 16;
USER_PERMISSIONS.VIEW_OTHER_USERS = 32;
USER_PERMISSIONS.MANIPULATE_PERMISSIONS = 64;
USER_PERMISSIONS.MANIPULATE_INVITE_ABILITIES = 128;
USER_PERMISSIONS.BAN_OTHERS = 256;
USER_PERMISSIONS.GET_OTHERS_KEYS = 512;
USER_PERMISSIONS.ENABLE_ORWELL_MODE = 1024;
USER_PERMISSIONS.DELETE_ACCOUNTS = 2048;
// END -- Define user permissions

export const ALL_PERMISSIONS = Object.values(USER_PERMISSIONS).reduce((sum, value) => sum | value, 0);
export const hasPermission = (permissionslist, permission) => !!(permissionslist & permission);
export const permissions = (...permissionList) =>
    permissionList.reduce((combinedPermissions, permission) => combinedPermissions | permission, 0);