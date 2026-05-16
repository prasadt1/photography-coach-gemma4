/**
 * SkipLink — first focusable element; jumps to #main-content (WCAG 2.4.1)
 */
import React from 'react';

const SkipLink: React.FC = () => (
  <a href="#main-content" className="skip-link">
    Skip to main content
  </a>
);

export default SkipLink;
