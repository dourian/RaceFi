import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useAuth } from '../lib/auth-context';
import { SignIn } from './sign-in';
import { SignUp } from './sign-up';

export const AuthWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const [showSignUp, setShowSignUp] = useState(false);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        {/* You can add a loading spinner here */}
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.authContainer}>
        {showSignUp ? (
          <SignUp />
        ) : (
          <SignIn />
        )}
        
        {/* Toggle between sign in and sign up */}
        <View style={styles.toggleContainer}>
          <View style={styles.toggleButton} onTouchEnd={() => setShowSignUp(!showSignUp)}>
            <Text style={styles.toggleText}>
              {showSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f7fa',
  },
  authContainer: {
    flex: 1,
  },
  toggleContainer: {
    padding: 20,
    alignItems: 'center',
  },
  toggleButton: {
    padding: 10,
  },
  toggleText: {
    color: '#fc5200',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
}); 