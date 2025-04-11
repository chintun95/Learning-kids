import React from 'react';
import { Link, type ExternalPathString } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { type ComponentProps } from 'react';
import { Platform } from 'react-native';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: string };

export function ExternalLink({ href, ...rest }: Props) {
  return (
    <Link
      target="_blank"
      {...rest}
      href={href as ExternalPathString} // Explicitly cast href to ExternalPathString
      onPress={async (event) => {
        if (Platform.OS !== 'web') {
          // Prevent default browser behavior on native
          event.preventDefault();
          // Open in an in-app browser
          await openBrowserAsync(href);
        }
      }}
    />
  );
}
