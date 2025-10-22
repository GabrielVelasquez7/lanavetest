-- Delete all test data for encargada tables
DELETE FROM public.encargada_cuadre_details;
DELETE FROM public.weekly_payroll;
DELETE FROM public.inter_agency_debts;
DELETE FROM public.inter_agency_loans;
DELETE FROM public.employees WHERE is_active = true;

-- Delete expenses, mobile_payments and point_of_sale that have agency_id
DELETE FROM public.expenses WHERE agency_id IS NOT NULL;
DELETE FROM public.mobile_payments WHERE agency_id IS NOT NULL;
DELETE FROM public.point_of_sale WHERE agency_id IS NOT NULL;