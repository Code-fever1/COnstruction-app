'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Project {
  _id: string;
  name: string;
}

interface Income {
  _id: string;
  projectId?: { _id: string; name: string };
  amount: number;
  date: string;
  description: string;
  mode: string;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
  };
  cashLocation?: string;
}

interface Expense {
  _id: string;
  projectId?: { _id: string; name: string };
  type: string;
  amount: number;
  date: string;
  description: string;
  mode: string;
  paidBy: string;
  vendor?: string;
  vendorPaymentStatus?: 'pending' | 'partial' | 'full';
  vendorPaidAmount?: number;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
  };
  cashLocation?: string;
  materialDetails?: {
    materialName?: string;
    quantity?: number;
    unit?: string;
  };
  laborDetails?: {
    laborType?: string;
    contractorName?: string;
    teamName?: string;
    laborName?: string;
  };
  pettyCashDetails?: {
    supervisorName?: string;
    summary?: string;
  };
}

interface Loan {
  _id: string;
  projectId?: { _id: string; name: string };
  borrowerName?: string;
  amountGiven: number;
  amountReturned: number;
  dateGiven: string;
  dateReturned?: string;
  status: string;
  description?: string;
}

export default function AccountantDashboard() {
  const [stats, setStats] = useState({
    totalExpenses: 0,
    totalIncome: 0,
    recentExpenses: 0,
    totalOutstandingLoans: 0,
    pendingPayments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allIncome, setAllIncome] = useState<Income[]>([]);
  const [allLoans, setAllLoans] = useState<Loan[]>([]);
  const [viewingIncome, setViewingIncome] = useState<Income | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [viewingLoan, setViewingLoan] = useState<Loan | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [selectedProject, allExpenses, allIncome, allLoans]);

  const getExpenseEffectiveAmount = (exp: Expense) => {
    // For material expenses with vendor payment status
    if (exp.type === 'material' && exp.vendorPaymentStatus) {
      if (exp.vendorPaymentStatus === 'pending') {
        return 0; // Exclude pending payments from total
      }
      if (exp.vendorPaymentStatus === 'partial' || exp.vendorPaymentStatus === 'full') {
        const paid = typeof exp.vendorPaidAmount === 'number' ? exp.vendorPaidAmount : 0;
        return Math.max(0, Math.min(paid, exp.amount));
      }
    }
    return exp.amount;
  };

  const fetchData = async () => {
    try {
      const [expensesRes, incomeRes, loansRes, projectsRes] = await Promise.all([
        fetch('/api/expenses'),
        fetch('/api/income'),
        fetch('/api/loans'),
        fetch('/api/projects'),
      ]);
      const expensesData = await expensesRes.json();
      const incomeData = await incomeRes.json();
      const loansData = await loansRes.json();
      const projectsData = await projectsRes.json();

      setAllExpenses(Array.isArray(expensesData) ? expensesData : []);
      setAllIncome(Array.isArray(incomeData) ? incomeData : []);
      setAllLoans(Array.isArray(loansData) ? loansData : []);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    let expenses: Expense[] = allExpenses;
    let income: Income[] = allIncome;
    let loans: Loan[] = allLoans;

    if (selectedProject !== 'all') {
      expenses = allExpenses.filter((exp) => exp.projectId?._id === selectedProject);
      income = allIncome.filter((inc) => inc.projectId?._id === selectedProject);
      loans = allLoans.filter((loan) => loan.projectId?._id === selectedProject);
    }

    const totalExpenses = expenses.reduce((sum, exp) => sum + getExpenseEffectiveAmount(exp), 0);
    const totalIncome = income.reduce((sum, inc) => sum + inc.amount, 0);
    const totalOutstandingLoans = loans.reduce((sum, loan) => sum + (loan.amountGiven - loan.amountReturned), 0);
    const recentExpenses = expenses.filter((exp) => {
      const date = new Date(exp.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    }).length;

    // Calculate pending payments
    const pendingPayments = expenses
      .filter(exp => exp.type === 'material')
      .reduce((sum, exp) => {
        if (exp.vendorPaymentStatus === 'pending') {
          return sum + exp.amount;
        } else if (exp.vendorPaymentStatus === 'partial' && exp.vendorPaidAmount) {
          // For partial payments, add the remaining amount
          const remaining = exp.amount - exp.vendorPaidAmount;
          return sum + Math.max(0, remaining);
        }
        return sum;
      }, 0);

    setStats({ totalExpenses, totalIncome, recentExpenses, totalOutstandingLoans, pendingPayments });
  };

  const filteredIncome = selectedProject === 'all'
    ? allIncome
    : allIncome.filter((inc) => inc.projectId?._id === selectedProject);

  const filteredExpenses = selectedProject === 'all'
    ? allExpenses
    : allExpenses.filter((exp) => exp.projectId?._id === selectedProject);

  const filteredLoans = selectedProject === 'all'
    ? allLoans
    : allLoans.filter((loan) => loan.projectId?._id === selectedProject);

  const incomeTotal = filteredIncome.reduce((sum, inc) => sum + inc.amount, 0);
  const expenseTotal = filteredExpenses.reduce((sum, exp) => sum + getExpenseEffectiveAmount(exp), 0);
  const loanOutstandingTotal = filteredLoans.reduce((sum, loan) => sum + (loan.amountGiven - loan.amountReturned), 0);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Accountant Dashboard</h1>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Filter by Project:</label>
          <select
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="all">All Projects</option>
            {projects.map((project) => (
              <option key={project._id} value={project._id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Income</h3>
          <div className="text-3xl font-bold text-green-600">Rs {stats.totalIncome.toLocaleString()}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Expenses</h3>
          <p className="text-3xl font-bold text-red-600">Rs {Math.abs(stats.totalExpenses).toLocaleString()}</p>
          {stats.pendingPayments > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              (Rs {stats.pendingPayments.toLocaleString()} pending to vendors)
            </p>
          )}
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Expenses This Week</h3>
          <p className="text-3xl font-bold text-indigo-600">{stats.recentExpenses}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Loan Outstanding</h3>
          <p className="text-3xl font-bold text-amber-600">Rs {stats.totalOutstandingLoans.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <Link
          href="/dashboard/accountant/expenses"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-all border-l-4 border-red-500"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Manage Expenses</h2>
          <p className="text-gray-600">Add and track project expenses</p>
        </Link>
        <Link
          href="/dashboard/accountant/income"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-all border-l-4 border-green-500"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Manage Income</h2>
          <p className="text-gray-600">Record income from projects</p>
        </Link>
        <Link
          href="/dashboard/accountant/loans"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-all border-l-4 border-amber-500"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Manage Loans</h2>
          <p className="text-gray-600">Track project loans</p>
        </Link>
        <Link
          href="/dashboard/accountant/vendors"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-all border-l-4 border-purple-500"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Manage Vendors</h2>
          <p className="text-gray-600">Track vendor payments & balances</p>
        </Link>
        <Link
          href="/dashboard/accountant/contractors"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-all border-l-4 border-cyan-500"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Manage Contractors</h2>
          <p className="text-gray-600">Track contractor payments & balances</p>
        </Link>
      </div>

      {selectedProject !== 'all' && (
        <>
          {filteredIncome.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow mb-8">
              <div className="mb-4 flex items-center gap-3">
                <h3 className="text-xl font-semibold text-gray-900">Income Transactions</h3>
                <span className="inline-flex items-baseline px-3 py-1 rounded-full bg-green-50 border border-green-100">
                  <span className="text-xs font-medium text-green-600 uppercase tracking-wide mr-2">Total</span>
                  <span className="text-sm font-semibold text-green-700">Rs {incomeTotal.toLocaleString()}</span>
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Description</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Mode</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredIncome.map((inc, index) => (
                      <tr key={inc._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 text-sm text-gray-500">{new Date(inc.date).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{inc.description}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 capitalize">{inc.mode}</td>
                        <td className="px-4 py-2 text-sm font-semibold text-green-600">Rs {inc.amount.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          <button
                            onClick={() => setViewingIncome(inc)}
                            className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {filteredExpenses.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow mb-8">
              <div className="mb-4 flex items-center gap-3">
                <h3 className="text-xl font-semibold text-gray-900">Expense Transactions</h3>
                <span className="inline-flex items-baseline px-3 py-1 rounded-full bg-red-50 border border-red-100">
                  <span className="text-xs font-medium text-red-600 uppercase tracking-wide mr-2">Total</span>
                  <span className="text-sm font-semibold text-red-700">Rs {expenseTotal.toLocaleString()}</span>
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Description</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Mode</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredExpenses.map((exp, index) => (
                      <tr key={exp._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 text-sm text-gray-500">{new Date(exp.date).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 capitalize">{exp.type.replace('-', ' ')}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{exp.description}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 capitalize">{exp.mode}</td>
                        <td className="px-4 py-2 text-sm font-semibold text-red-600">Rs {getExpenseEffectiveAmount(exp).toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm font-semibold text-amber-600">
                          {exp.type === 'material' && (
                            exp.vendorPaymentStatus === 'pending' ? 
                              `Rs ${exp.amount.toLocaleString()}` :
                              exp.vendorPaymentStatus === 'partial' ? 
                                `Rs ${(exp.amount - (exp.vendorPaidAmount || 0)).toLocaleString()}` :
                                'Rs 0'
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          <button
                            onClick={() => setViewingExpense(exp)}
                            className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {filteredLoans.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow mb-8">
              <div className="mb-4 flex items-center gap-3">
                <h3 className="text-xl font-semibold text-gray-900">Loan Details</h3>
                <span className="inline-flex items-baseline px-3 py-1 rounded-full bg-amber-50 border border-amber-100">
                  <span className="text-xs font-medium text-amber-600 uppercase tracking-wide mr-2">Outstanding</span>
                  <span className="text-sm font-semibold text-amber-700">Rs {loanOutstandingTotal.toLocaleString()}</span>
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Given</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Returned</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Outstanding</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLoans.map((loan, index) => (
                      <tr key={loan._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 text-sm text-gray-500">{new Date(loan.dateGiven).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">Rs {loan.amountGiven.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">Rs {loan.amountReturned.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm font-semibold text-red-600">Rs {(loan.amountGiven - loan.amountReturned).toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{loan.status}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          <button
                            onClick={() => setViewingLoan(loan)}
                            className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {viewingIncome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Income Details</h3>
              <button
                onClick={() => setViewingIncome(null)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <p><span className="font-medium text-gray-700">Date:</span> {new Date(viewingIncome.date).toLocaleDateString()}</p>
              <p><span className="font-medium text-gray-700">Project:</span> {viewingIncome.projectId?.name || 'N/A'}</p>
              <p><span className="font-medium text-gray-700">Amount:</span> Rs {viewingIncome.amount.toLocaleString()}</p>
              <p><span className="font-medium text-gray-700">Mode:</span> {viewingIncome.mode}</p>
              <p><span className="font-medium text-gray-700">Description:</span> {viewingIncome.description || 'N/A'}</p>
              {viewingIncome.mode === 'bank' ? (
                <>
                  <p><span className="font-medium text-gray-700">Bank Name:</span> {viewingIncome.bankDetails?.bankName || 'N/A'}</p>
                  <p><span className="font-medium text-gray-700">Account Number:</span> {viewingIncome.bankDetails?.accountNumber || 'N/A'}</p>
                </>
              ) : (
                <p><span className="font-medium text-gray-700">Cash Location:</span> {viewingIncome.cashLocation || 'N/A'}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {viewingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Expense Details</h3>
              <button
                onClick={() => setViewingExpense(null)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <p><span className="font-medium text-gray-700">Date:</span> {new Date(viewingExpense.date).toLocaleDateString()}</p>
              <p><span className="font-medium text-gray-700">Project:</span> {viewingExpense.projectId?.name || 'N/A'}</p>
              <p><span className="font-medium text-gray-700">Type:</span> {viewingExpense.type}</p>
              <p><span className="font-medium text-gray-700">Amount:</span> Rs {viewingExpense.amount.toLocaleString()}</p>
              <p><span className="font-medium text-gray-700">Paid By:</span> {viewingExpense.paidBy || 'N/A'}</p>
              <p><span className="font-medium text-gray-700">Mode:</span> {viewingExpense.mode}</p>
              <p><span className="font-medium text-gray-700">Description:</span> {viewingExpense.description || 'N/A'}</p>
              {viewingExpense.type === 'material' && (
                <>
                  <p><span className="font-medium text-gray-700">Vendor:</span> {viewingExpense.vendor || 'N/A'}</p>
                  <p><span className="font-medium text-gray-700">Material:</span> {viewingExpense.materialDetails?.materialName || 'N/A'}</p>
                  <p><span className="font-medium text-gray-700">Quantity:</span> {viewingExpense.materialDetails?.quantity ?? 'N/A'}</p>
                  <p><span className="font-medium text-gray-700">Unit:</span> {viewingExpense.materialDetails?.unit || 'N/A'}</p>
                </>
              )}
              {viewingExpense.type === 'labor' && (
                <>
                  <p><span className="font-medium text-gray-700">Labor Type:</span> {viewingExpense.laborDetails?.laborType || 'N/A'}</p>
                  <p><span className="font-medium text-gray-700">Contractor:</span> {viewingExpense.laborDetails?.contractorName || 'N/A'}</p>
                  <p><span className="font-medium text-gray-700">Team:</span> {viewingExpense.laborDetails?.teamName || 'N/A'}</p>
                  <p><span className="font-medium text-gray-700">Labor:</span> {viewingExpense.laborDetails?.laborName || 'N/A'}</p>
                </>
              )}
              {viewingExpense.type === 'petty-cash' && (
                <>
                  <p><span className="font-medium text-gray-700">Supervisor:</span> {viewingExpense.pettyCashDetails?.supervisorName || 'N/A'}</p>
                  <p><span className="font-medium text-gray-700">Summary:</span> {viewingExpense.pettyCashDetails?.summary || 'N/A'}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {viewingLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Loan Details</h3>
              <button
                onClick={() => setViewingLoan(null)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <p><span className="font-medium text-gray-700">Date Given:</span> {new Date(viewingLoan.dateGiven).toLocaleDateString()}</p>
              <p><span className="font-medium text-gray-700">Project:</span> {viewingLoan.projectId?.name || 'N/A'}</p>
              <p><span className="font-medium text-gray-700">Borrower:</span> {viewingLoan.borrowerName || 'N/A'}</p>
              <p><span className="font-medium text-gray-700">Amount Given:</span> Rs {viewingLoan.amountGiven.toLocaleString()}</p>
              <p><span className="font-medium text-gray-700">Amount Returned:</span> Rs {viewingLoan.amountReturned.toLocaleString()}</p>
              <p><span className="font-medium text-gray-700">Outstanding:</span> Rs {(viewingLoan.amountGiven - viewingLoan.amountReturned).toLocaleString()}</p>
              <p><span className="font-medium text-gray-700">Status:</span> {viewingLoan.status}</p>
              <p><span className="font-medium text-gray-700">Description:</span> {viewingLoan.description || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
