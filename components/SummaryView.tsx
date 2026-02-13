'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface Project {
  _id: string;
  name: string;
}

interface Income {
  _id: string;
  projectId?: { _id: string; name: string };
  date: string;
  description: string;
  amount: number;
  mode: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
  };
  cashLocation?: string;
}

interface Expense {
  _id: string;
  projectId?: { _id: string; name: string };
  date: string;
  type: string;
  vendor?: string;
  description: string;
  amount: number;
  mode: string;
  paidBy?: string;
  materialDetails?: {
    materialName?: string;
    quantity?: number;
    unit?: string;
  };
  laborDetails?: {
    contractorName?: string;
    teamName?: string;
    laborName?: string;
  };
  pettyCashDetails?: {
    supervisorName?: string;
    summary?: string;
  };
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
  };
  cashLocation?: string;
}

interface Loan {
  _id: string;
  projectId?: { _id: string; name: string };
  borrowerName?: string;
  lenderName?: string;
  dateGiven: string;
  amountGiven: number;
  amountReturned: number;
  dateReturned?: string;
  description?: string;
  status: string;
}

interface Summary {
  project: { name: string; type: string } | null;
  income: {
    total: number;
    bank: number;
    cash: number;
    transactions: number;
  };
  expenses: {
    total: number;
    byType: {
      material: number;
      labor: number;
      overhead: number;
      pettyCash: number;
    };
    byMode: {
      bank: number;
      cash: number;
    };
    transactions: number;
  };
  materialSummary: Record<string, { quantity: number; totalCost: number; unit: string }>;
  cashPosition: {
    bank: number;
    locker1: number;
    locker2: number;
    total: number;
  };
  loans: {
    totalGiven: number;
    totalReturned: number;
    outstanding: number;
    activeCount: number;
  };
  profit: number;
}

export default function SummaryView() {
  const searchParams = useSearchParams();
  const projectIdFromUrl = searchParams.get('projectId');

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(projectIdFromUrl || '');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [incomeList, setIncomeList] = useState<Income[]>([]);
  const [expensesList, setExpensesList] = useState<Expense[]>([]);
  const [loansList, setLoansList] = useState<Loan[]>([]);
  const [viewingIncome, setViewingIncome] = useState<Income | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [viewingLoan, setViewingLoan] = useState<Loan | null>(null);
  const [incomeModeFilter, setIncomeModeFilter] = useState<'all' | 'bank' | 'cash'>('all');
  const [incomeSort, setIncomeSort] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [expenseTypeFilter, setExpenseTypeFilter] = useState<'all' | 'material' | 'labor' | 'factory-overhead' | 'petty-cash'>('all');
  const [expenseModeFilter, setExpenseModeFilter] = useState<'all' | 'bank' | 'cash'>('all');
  const [expenseSort, setExpenseSort] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [loanStatusFilter, setLoanStatusFilter] = useState<'all' | 'active' | 'partial' | 'returned'>('all');
  const [loanSort, setLoanSort] = useState<'date_desc' | 'date_asc' | 'outstanding_desc' | 'outstanding_asc'>('date_desc');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject || projects.length > 0) {
      fetchSummary();
      if (selectedProject && selectedProject !== 'all') {
        fetchTransactions();
      } else {
        setIncomeList([]);
        setExpensesList([]);
        setLoansList([]);
      }
    }
  }, [selectedProject, projects]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      setProjects(data);
      if (data.length > 0 && !selectedProject) {
        setSelectedProject('all');
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const [incomeRes, expensesRes, loansRes] = await Promise.all([
        fetch(`/api/income?projectId=${selectedProject}`),
        fetch(`/api/expenses?projectId=${selectedProject}`),
        fetch(`/api/loans?projectId=${selectedProject}`),
      ]);
      const incomeData = await incomeRes.json();
      const expensesData = await expensesRes.json();
      const loansData = await loansRes.json();
      setIncomeList(Array.isArray(incomeData) ? incomeData : []);
      setExpensesList(Array.isArray(expensesData) ? expensesData : []);
      setLoansList(Array.isArray(loansData) ? loansData : []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const url = selectedProject === 'all'
        ? '/api/summary'
        : `/api/summary?projectId=${selectedProject}`;
      const response = await fetch(url);
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const visibleIncome = incomeList
    .filter((inc) => incomeModeFilter === 'all' || inc.mode === incomeModeFilter)
    .sort((a, b) => {
      switch (incomeSort) {
        case 'date_asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'amount_desc':
          return b.amount - a.amount;
        case 'amount_asc':
          return a.amount - b.amount;
        case 'date_desc':
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

  const visibleExpenses = expensesList
    .filter((exp) => (expenseTypeFilter === 'all' || exp.type === expenseTypeFilter) && (expenseModeFilter === 'all' || exp.mode === expenseModeFilter))
    .sort((a, b) => {
      switch (expenseSort) {
        case 'date_asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'amount_desc':
          return b.amount - a.amount;
        case 'amount_asc':
          return a.amount - b.amount;
        case 'date_desc':
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

  const visibleLoans = loansList
    .filter((loan) => loanStatusFilter === 'all' || loan.status === loanStatusFilter)
    .sort((a, b) => {
      const aOutstanding = a.amountGiven - a.amountReturned;
      const bOutstanding = b.amountGiven - b.amountReturned;
      switch (loanSort) {
        case 'date_asc':
          return new Date(a.dateGiven).getTime() - new Date(b.dateGiven).getTime();
        case 'outstanding_desc':
          return bOutstanding - aOutstanding;
        case 'outstanding_asc':
          return aOutstanding - bOutstanding;
        case 'date_desc':
        default:
          return new Date(b.dateGiven).getTime() - new Date(a.dateGiven).getTime();
      }
    });

  const visibleIncomeTotal = visibleIncome.reduce((sum, inc) => sum + inc.amount, 0);
  const visibleExpenseTotal = visibleExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const visibleLoanOutstandingTotal = visibleLoans.reduce(
    (sum, loan) => sum + (loan.amountGiven - loan.amountReturned),
    0
  );

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  if (!summary) {
    return <div className="text-center">No data available</div>;
  }

  const isCashPositive = summary.cashPosition.total >= 0;
  const cashAmountToneClass = isCashPositive
    ? 'text-green-700 bg-green-100/70'
    : 'text-red-700 bg-red-100/70';
  const cashDirectionArrow = isCashPositive ? '↑' : '↓';

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Financial Summary</h1>
        <select
          className="px-4 py-2 border border-gray-300 rounded-md"
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

      {summary.project && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold text-gray-900">{summary.project.name}</h2>
          <p className="text-gray-600">Type: {summary.project.type}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Income</h3>
          <p className="text-3xl font-bold text-green-600">Rs {summary.income.total.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-2">
            Bank: Rs {summary.income.bank.toLocaleString()}<br />
            Cash: Rs {summary.income.cash.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Expenses</h3>
          <p className="text-3xl font-bold text-red-600">Rs {summary.expenses.total.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-2">{summary.expenses.transactions} transactions</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Cash Position</h3>
          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${cashAmountToneClass}`}>
            <span className="text-sm font-semibold">{cashDirectionArrow}</span>
            <p className="text-3xl font-bold">Rs {summary.cashPosition.total.toLocaleString()}</p>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Bank: Rs {summary.cashPosition.bank.toLocaleString()}<br />
            Locker 1: Rs {summary.cashPosition.locker1.toLocaleString()}<br />
            Locker 2: Rs {summary.cashPosition.locker2.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Loan Outstanding</h3>
          <p className="text-3xl font-bold text-amber-600">Rs {summary.loans.outstanding.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-2">
            Given: Rs {summary.loans.totalGiven.toLocaleString()}<br />
            Returned: Rs {summary.loans.totalReturned.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Expenses by Type</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-700">Material</span>
              <span className="font-semibold">Rs {summary.expenses.byType.material.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Labor</span>
              <span className="font-semibold">Rs {summary.expenses.byType.labor.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Factory Overhead</span>
              <span className="font-semibold">Rs {summary.expenses.byType.overhead.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Petty Cash</span>
              <span className="font-semibold">Rs {summary.expenses.byType.pettyCash.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Loan Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-700">Total Given</span>
              <span className="font-semibold">Rs {summary.loans.totalGiven.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Total Returned</span>
              <span className="font-semibold text-green-600">Rs {summary.loans.totalReturned.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Outstanding</span>
              <span className="font-semibold text-red-600">Rs {summary.loans.outstanding.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Active Loans</span>
              <span className="font-semibold">{summary.loans.activeCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Details - Only for specific projects */}
      {selectedProject && selectedProject !== 'all' && (
        <>
          {/* Income List */}
          {incomeList.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold text-gray-900">Income Transactions</h3>
                  <span className="inline-flex items-baseline px-3 py-1 rounded-full bg-green-50 border border-green-100">
                    <span className="text-xs font-medium text-green-600 uppercase tracking-wide mr-2">Total</span>
                    <span className="text-sm font-semibold text-green-700">Rs {visibleIncomeTotal.toLocaleString()}</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    value={incomeModeFilter}
                    onChange={(e) => setIncomeModeFilter(e.target.value as typeof incomeModeFilter)}
                  >
                    <option value="all">All Modes</option>
                    <option value="bank">Bank</option>
                    <option value="cash">Cash</option>
                  </select>
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    value={incomeSort}
                    onChange={(e) => setIncomeSort(e.target.value as typeof incomeSort)}
                  >
                    <option value="date_desc">Newest First</option>
                    <option value="date_asc">Oldest First</option>
                    <option value="amount_desc">Amount High to Low</option>
                    <option value="amount_asc">Amount Low to High</option>
                  </select>
                </div>
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
                    {visibleIncome.map((inc, index) => (
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
                    {visibleIncome.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                          No income records match selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Expenses List */}
          {expensesList.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold text-gray-900">Expense Transactions</h3>
                  <span className="inline-flex items-baseline px-3 py-1 rounded-full bg-red-50 border border-red-100">
                    <span className="text-xs font-medium text-red-600 uppercase tracking-wide mr-2">Total</span>
                    <span className="text-sm font-semibold text-red-700">Rs {visibleExpenseTotal.toLocaleString()}</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    value={expenseTypeFilter}
                    onChange={(e) => setExpenseTypeFilter(e.target.value as typeof expenseTypeFilter)}
                  >
                    <option value="all">All Types</option>
                    <option value="material">Material</option>
                    <option value="labor">Labor</option>
                    <option value="factory-overhead">Factory Overhead</option>
                    <option value="petty-cash">Petty Cash</option>
                  </select>
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    value={expenseModeFilter}
                    onChange={(e) => setExpenseModeFilter(e.target.value as typeof expenseModeFilter)}
                  >
                    <option value="all">All Modes</option>
                    <option value="bank">Bank</option>
                    <option value="cash">Cash</option>
                  </select>
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    value={expenseSort}
                    onChange={(e) => setExpenseSort(e.target.value as typeof expenseSort)}
                  >
                    <option value="date_desc">Newest First</option>
                    <option value="date_asc">Oldest First</option>
                    <option value="amount_desc">Amount High to Low</option>
                    <option value="amount_asc">Amount Low to High</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Vendor</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Description</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Mode</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {visibleExpenses.map((exp, index) => (
                      <tr key={exp._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 text-sm text-gray-500">{new Date(exp.date).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 capitalize">{exp.type.replace('-', ' ')}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{exp.vendor || 'N/A'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{exp.description}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 capitalize">{exp.mode}</td>
                        <td className="px-4 py-2 text-sm font-semibold text-red-600">Rs {exp.amount.toLocaleString()}</td>
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
                    {visibleExpenses.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                          No expense records match selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Loans List */}
          {loansList.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold text-gray-900">Loan Details</h3>
                  <span className="inline-flex items-baseline px-3 py-1 rounded-full bg-amber-50 border border-amber-100">
                    <span className="text-xs font-medium text-amber-600 uppercase tracking-wide mr-2">Outstanding</span>
                    <span className="text-sm font-semibold text-amber-700">Rs {visibleLoanOutstandingTotal.toLocaleString()}</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    value={loanStatusFilter}
                    onChange={(e) => setLoanStatusFilter(e.target.value as typeof loanStatusFilter)}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="partial">Partial</option>
                    <option value="returned">Returned</option>
                  </select>
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    value={loanSort}
                    onChange={(e) => setLoanSort(e.target.value as typeof loanSort)}
                  >
                    <option value="date_desc">Newest First</option>
                    <option value="date_asc">Oldest First</option>
                    <option value="outstanding_desc">Outstanding High to Low</option>
                    <option value="outstanding_asc">Outstanding Low to High</option>
                  </select>
                </div>
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
                    {visibleLoans.map((loan, index) => (
                      <tr key={loan._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 text-sm text-gray-500">{new Date(loan.dateGiven).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">Rs {loan.amountGiven.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">Rs {loan.amountReturned.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm font-semibold text-red-600">Rs {(loan.amountGiven - loan.amountReturned).toLocaleString()}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${loan.status === 'returned' ? 'bg-green-100 text-green-800' :
                            loan.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                            {loan.status}
                          </span>
                        </td>
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
                    {visibleLoans.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                          No loan records match selected filters.
                        </td>
                      </tr>
                    )}
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

            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">General</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <p><span className="font-medium text-gray-700">Date:</span> {new Date(viewingIncome.date).toLocaleDateString()}</p>
                  <p><span className="font-medium text-gray-700">Project:</span> {viewingIncome.projectId?.name || summary.project?.name || 'N/A'}</p>
                  <p><span className="font-medium text-gray-700">Amount:</span> Rs {viewingIncome.amount.toLocaleString()}</p>
                  <p><span className="font-medium text-gray-700">Mode:</span> {viewingIncome.mode}</p>
                </div>
                <p className="text-sm mt-3">
                  <span className="font-medium text-gray-700">Description:</span> {viewingIncome.description || 'N/A'}
                </p>
              </div>

              {viewingIncome.mode === 'bank' ? (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">Bank Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <p><span className="font-medium text-gray-700">Bank Name:</span> {viewingIncome.bankDetails?.bankName || 'N/A'}</p>
                    <p><span className="font-medium text-gray-700">Account Number:</span> {viewingIncome.bankDetails?.accountNumber || 'N/A'}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">Cash Details</h4>
                  <p className="text-sm"><span className="font-medium text-gray-700">Location:</span> {viewingIncome.cashLocation || 'N/A'}</p>
                </div>
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

            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">General</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <p><span className="font-medium text-gray-700">Date:</span> {new Date(viewingExpense.date).toLocaleDateString()}</p>
                  <p><span className="font-medium text-gray-700">Project:</span> {viewingExpense.projectId?.name || summary.project?.name || 'N/A'}</p>
                  <p><span className="font-medium text-gray-700">Type:</span> {viewingExpense.type.replace('-', ' ')}</p>
                  <p><span className="font-medium text-gray-700">Amount:</span> Rs {viewingExpense.amount.toLocaleString()}</p>
                  <p><span className="font-medium text-gray-700">Paid By:</span> {viewingExpense.paidBy || 'N/A'}</p>
                  <p><span className="font-medium text-gray-700">Mode:</span> {viewingExpense.mode}</p>
                </div>
                <p className="text-sm mt-3">
                  <span className="font-medium text-gray-700">Description:</span> {viewingExpense.description || 'N/A'}
                </p>
              </div>

              {viewingExpense.mode === 'bank' ? (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">Bank Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <p><span className="font-medium text-gray-700">Bank Name:</span> {viewingExpense.bankDetails?.bankName || 'N/A'}</p>
                    <p><span className="font-medium text-gray-700">Account Number:</span> {viewingExpense.bankDetails?.accountNumber || 'N/A'}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">Cash Details</h4>
                  <p className="text-sm"><span className="font-medium text-gray-700">Location:</span> {viewingExpense.cashLocation || 'N/A'}</p>
                </div>
              )}

              {viewingExpense.type === 'material' && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">Material Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <p><span className="font-medium text-gray-700">Vendor:</span> {viewingExpense.vendor || 'N/A'}</p>
                    <p><span className="font-medium text-gray-700">Material:</span> {viewingExpense.materialDetails?.materialName || 'N/A'}</p>
                    <p><span className="font-medium text-gray-700">Quantity:</span> {viewingExpense.materialDetails?.quantity ?? 'N/A'}</p>
                    <p><span className="font-medium text-gray-700">Unit:</span> {viewingExpense.materialDetails?.unit || 'N/A'}</p>
                  </div>
                </div>
              )}

              {viewingExpense.type === 'labor' && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">Labor Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <p><span className="font-medium text-gray-700">Contractor:</span> {viewingExpense.laborDetails?.contractorName || 'N/A'}</p>
                    <p><span className="font-medium text-gray-700">Team:</span> {viewingExpense.laborDetails?.teamName || 'N/A'}</p>
                    <p><span className="font-medium text-gray-700">Labor:</span> {viewingExpense.laborDetails?.laborName || 'N/A'}</p>
                  </div>
                </div>
              )}

              {viewingExpense.type === 'petty-cash' && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">Petty Cash Details</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium text-gray-700">Supervisor:</span> {viewingExpense.pettyCashDetails?.supervisorName || 'N/A'}</p>
                    <p><span className="font-medium text-gray-700">Summary:</span> {viewingExpense.pettyCashDetails?.summary || 'N/A'}</p>
                  </div>
                </div>
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

            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">General</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <p><span className="font-medium text-gray-700">Project:</span> {viewingLoan.projectId?.name || summary.project?.name || 'N/A'}</p>
                  <p><span className="font-medium text-gray-700">Borrower:</span> {viewingLoan.borrowerName || viewingLoan.lenderName || 'N/A'}</p>
                  <p><span className="font-medium text-gray-700">Date Given:</span> {new Date(viewingLoan.dateGiven).toLocaleDateString()}</p>
                  <p><span className="font-medium text-gray-700">Date Returned:</span> {viewingLoan.dateReturned ? new Date(viewingLoan.dateReturned).toLocaleDateString() : 'N/A'}</p>
                  <p><span className="font-medium text-gray-700">Amount Given:</span> Rs {viewingLoan.amountGiven.toLocaleString()}</p>
                  <p><span className="font-medium text-gray-700">Amount Returned:</span> Rs {viewingLoan.amountReturned.toLocaleString()}</p>
                  <p><span className="font-medium text-gray-700">Outstanding:</span> Rs {(viewingLoan.amountGiven - viewingLoan.amountReturned).toLocaleString()}</p>
                  <p><span className="font-medium text-gray-700">Status:</span> {viewingLoan.status}</p>
                </div>
                <p className="text-sm mt-3">
                  <span className="font-medium text-gray-700">Description:</span> {viewingLoan.description || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
