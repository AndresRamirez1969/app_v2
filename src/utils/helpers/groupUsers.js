export const groupUsersByRole = (users) => {
  const groupedRoles = {};

  users.forEach((user) => {
    const role = user?.roles?.[0];
    if (role) {
      if (!groupedRoles[role.id]) {
        groupedRoles[role.id] = {
          id: role.id,
          name: role.name,
          users: [],
          customLabel: role.name
        };
      }
      groupedRoles[role.id].users.push(user);
    }
  });

  return Object.values(groupedRoles);
};
