import React from 'react';

const BreadcrumbItem = ({ children, ...props }) => {
  return <li {...props}>{children}</li>;
};

export default BreadcrumbItem;
