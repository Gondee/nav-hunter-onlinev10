'use client';

import { useEffect, useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function DashboardInput(props: InputProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR, render a basic input without any browser-specific attributes
  if (!mounted) {
    const { onChange, ...restProps } = props;
    return <input {...restProps} readOnly />;
  }

  // After mounting, render the full interactive input
  return <input {...props} />;
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function DashboardTextArea(props: TextAreaProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    const { onChange, ...restProps } = props;
    return <textarea {...restProps} readOnly />;
  }

  return <textarea {...props} />;
}