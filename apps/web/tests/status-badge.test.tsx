import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../components/badge';
describe('StatusBadge',()=>{it('renders normalized status text',()=>{render(<StatusBadge value="PENDING_APPROVAL"/>);expect(screen.getByText('PENDING APPROVAL')).toBeInTheDocument();});});
