import React from 'react';
import { 
  Box, 
  VStack, 
  Heading, 
  FormControl, 
  FormLabel, 
  Input, 
  Button,
  Text,
  Link as ChakraLink
} from '@chakra-ui/react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Login Schema
const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export default function Login() {
  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm({
    resolver: zodResolver(LoginSchema)
  });

  const onSubmit = (data: z.infer<typeof LoginSchema>) => {
    // Implement login logic here
    console.log('Login Attempt:', data);
  };

  return (
    <Box 
      minHeight="100vh" 
      display="flex" 
      alignItems="center" 
      justifyContent="center"
      bg="gray.50"
    >
      <Box 
        width="100%" 
        maxWidth="400px" 
        p={8} 
        bg="white" 
        boxShadow="md" 
        borderRadius="lg"
      >
        <VStack spacing={6} align="stretch">
          <Heading 
            textAlign="center" 
            size="lg" 
            color="gray.700"
          >
            WellConnect Pro
          </Heading>

          <form onSubmit={handleSubmit(onSubmit)}>
            <VStack spacing={4}>
              <FormControl isInvalid={!!errors.email}>
                <FormLabel>Email</FormLabel>
                <Input 
                  type="email" 
                  placeholder="Enter your email" 
                  {...register('email')}
                />
                {errors.email && (
                  <Text color="red.500" fontSize="sm">
                    {errors.email.message}
                  </Text>
                )}
              </FormControl>

              <FormControl isInvalid={!!errors.password}>
                <FormLabel>Password</FormLabel>
                <Input 
                  type="password" 
                  placeholder="Enter your password" 
                  {...register('password')}
                />
                {errors.password && (
                  <Text color="red.500" fontSize="sm">
                    {errors.password.message}
                  </Text>
                )}
              </FormControl>

              <Button 
                type="submit" 
                colorScheme="blue" 
                width="full"
              >
                Login
              </Button>
            </VStack>
          </form>

          <VStack spacing={2} mt={4}>
            <Link href="/signup" passHref>
              <ChakraLink color="blue.500">
                Create an account
              </ChakraLink>
            </Link>
            <Link href="/forgot-password" passHref>
              <ChakraLink color="gray.500" fontSize="sm">
                Forgot password?
              </ChakraLink>
            </Link>
          </VStack>
        </VStack>
      </Box>
    </Box>
  );
}
