import { useMemo } from 'react';
import type { Payment, Student, Class } from '../../types/domain';

export function useFinancialCalculations(finePercent: number, transportFee: number) {
  const calcMonthsOverdue = (due: string) => {
    const d = new Date(due);
    const now = new Date();
    if (now <= d) return 0;
    return Math.max(0, (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()));
  };

  const calcFine = (amount: number, months: number) => months <= 0 ? 0 : amount * (finePercent / 100) * months;

  const autoDueDate = (month: number, year: number) => `${year}-${String(month).padStart(2, '0')}-05`;

  const genReceipt = (id: string) => `REC-${id.replace(/-/g, '').substring(0, 8).toUpperCase()}`;

  const calculatePaymentTotals = (payment: Payment) => {
    const monthsOverdue = payment.status === 'overdue' ? calcMonthsOverdue(payment.dueDate) : 0;
    const fine = calcFine(payment.amount, monthsOverdue);
    const hasTransport = payment.notes?.includes('transporte escolar');
    const baseAmount = hasTransport ? payment.amount - transportFee : payment.amount;
    const total = payment.amount + fine;
    return { monthsOverdue, fine, hasTransport, baseAmount, total };
  };

  return { calcMonthsOverdue, calcFine, autoDueDate, genReceipt, calculatePaymentTotals };
}

export function useFilteredPayments(
  payments: Payment[],
  students: Student[],
  classes: Class[],
  filters: {
    search: string;
    status: string;
    classId: string;
    month: string;
    year: string;
  }
) {
  const studentMap = useMemo(() => new Map(students.map(s => [s.id, s])), [students]);
  const classMap = useMemo(() => new Map(classes.map(c => [c.id, c])), [classes]);

  return useMemo(() => {
    return payments.filter(p => {
      const student = studentMap.get(p.studentId);
      const className = student ? classMap.get(student.classId)?.name || '' : '';
      const studentName = student?.name || '';

      const matchSearch = !filters.search ||
        studentName.toLowerCase().includes(filters.search.toLowerCase()) ||
        className.toLowerCase().includes(filters.search.toLowerCase());

      const matchStatus = !filters.status || p.status === filters.status;
      const matchClass = !filters.classId || student?.classId === filters.classId;
      const matchMonth = !filters.month || p.month === parseInt(filters.month);
      const matchYear = !filters.year || p.year === parseInt(filters.year);

      return matchSearch && matchStatus && matchClass && matchMonth && matchYear;
    });
  }, [payments, filters, studentMap, classMap]);
}