import HomeScreen from '../../src/screens/HomeScreen';
import InternalLayout from '../../src/components/InternalLayout';

export default function HomeRoute() {
  return (
    <InternalLayout>
      <HomeScreen useLayoutNavigation />
    </InternalLayout>
  );
}
