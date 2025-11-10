import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const AuthLayout = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast({
          title: "Error al iniciar sesión",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Algo salió mal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Animated Money Background */}
      <div className="absolute inset-0 pointer-events-none">
        <MoneyIcon icon="DollarSign" delay={0} />
        <MoneyIcon icon="Coins" delay={2} />
        <MoneyIcon icon="Banknote" delay={4} />
        <MoneyIcon icon="Wallet" delay={1} />
        <MoneyIcon icon="CreditCard" delay={3} />
        <MoneyIcon icon="CircleDollarSign" delay={5} />
      </div>

      <Card className="w-full max-w-md relative z-10">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Sistema de Loterías</CardTitle>
          <CardDescription className="text-center">
            Iniciar sesión
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Cargando...' : 'Iniciar sesión'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

// Floating money icon component
const MoneyIcon = ({ icon, delay }: { icon: string; delay: number }) => {
  const icons = {
    DollarSign: '💵',
    Coins: '🪙',
    Banknote: '💸',
    Wallet: '💰',
    CreditCard: '💳',
    CircleDollarSign: '💲',
  };

  const randomPosition = {
    left: `${Math.random() * 100}%`,
    animationDelay: `${delay}s`,
  };

  return (
    <div
      className="absolute text-4xl opacity-20 animate-float"
      style={randomPosition}
    >
      {icons[icon as keyof typeof icons]}
    </div>
  );
};