import React from 'react';
import { 
  Box, 
  Flex, 
  VStack, 
  Heading, 
  Text, 
  Icon, 
  Divider,
  ChakraProvider 
} from '@chakra-ui/react';
import { 
  FaChartLine, 
  FaEnvelope, 
  FaShieldAlt, 
  FaRobot, 
  FaSearch 
} from 'react-icons/fa';
import Link from 'next/link';

// Sidebar navigation component
const Sidebar = () => {
  const menuItems = [
    { 
      label: 'Dashboard', 
      icon: FaChartLine, 
      href: '/dashboard' 
    },
    { 
      label: 'Email Dispatch', 
      icon: FaEnvelope, 
      href: '/dashboard/email-dispatch' 
    },
    { 
      label: 'Compliance', 
      icon: FaShieldAlt, 
      href: '/dashboard/compliance' 
    },
    { 
      label: 'Content Generation', 
      icon: FaRobot, 
      href: '/dashboard/content-generation' 
    },
    { 
      label: 'Email Discovery', 
      icon: FaSearch, 
      href: '/dashboard/email-discovery' 
    }
  ];

  return (
    <Box 
      width="250px" 
      bg="blue.600" 
      color="white" 
      p={6} 
      height="100vh" 
      position="fixed" 
      left={0} 
      top={0}
    >
      <Heading size="lg" mb={8} textAlign="center">
        WellConnect Pro
      </Heading>

      <VStack align="stretch" spacing={4}>
        {menuItems.map((item, index) => (
          <Link href={item.href} key={index} passHref>
            <Flex 
              as="a" 
              alignItems="center" 
              p={3} 
              borderRadius="md" 
              _hover={{ 
                bg: 'blue.500', 
                transform: 'translateX(10px)' 
              }}
              transition="all 0.3s"
            >
              <Icon as={item.icon} mr={4} />
              <Text>{item.label}</Text>
            </Flex>
          </Link>
        ))}
      </VStack>

      <Divider my={8} />

      <Box>
        <Text fontSize="sm" textAlign="center" opacity={0.7}>
          Ethical AI Mental Health Marketing
        </Text>
        <Text fontSize="xs" textAlign="center" opacity={0.5} mt={2}>
          © 2025 WellConnect Pro
        </Text>
      </Box>
    </Box>
  );
};

export default function DashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <ChakraProvider>
      <Flex>
        <Sidebar />
        <Box 
          ml="250px" 
          width="calc(100% - 250px)" 
          bg="gray.50" 
          minHeight="100vh" 
          p={8}
        >
          {children}
        </Box>
      </Flex>
    </ChakraProvider>
  );
}
