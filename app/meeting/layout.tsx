"use client";
import React from 'react';

interface MeetingLayoutProps {
  children: React.ReactNode;
}

const MeetingLayout: React.FC<MeetingLayoutProps> = ({ children }) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Video Meeting</title>
        <meta name="description" content="Join video meetings with real-time communication" />
      </head>
      <body className="bg-gray-900 text-white">
        <div id="meeting-root">
          {children}
        </div>
      </body>
    </html>
  );
};

export default MeetingLayout;
