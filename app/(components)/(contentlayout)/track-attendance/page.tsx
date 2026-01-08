'use client';

import React, { useEffect, useState } from 'react';
import { fetchAllCandidates } from '@/shared/lib/candidates';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';

type Candidate = {
  id?: string;
  _id?: string;
  fullName?: string;
  email?: string;
};

export default function TrackAttendancePage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState<string>('');

  const loadCandidates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAllCandidates({ limit: 1000 });
      
      const candidatesList = Array.isArray(response) 
        ? response 
        : (Array.isArray((response as any)?.results) 
          ? (response as any).results 
          : (Array.isArray((response as any)?.data) 
            ? (response as any).data 
            : []));
      
      setCandidates(candidatesList);
      setFilteredCandidates(candidatesList);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  // Apply search filter
  useEffect(() => {
    if (!searchValue.trim()) {
      setFilteredCandidates(candidates);
      return;
    }

    const searchTerm = searchValue.toLowerCase().trim();
    const filtered = candidates.filter((candidate) => {
      const name = (candidate.fullName || '').toLowerCase();
      const email = (candidate.email || '').toLowerCase();
      return name.includes(searchTerm) || email.includes(searchTerm);
    });

    setFilteredCandidates(filtered);
  }, [candidates, searchValue]);

  const getCandidateId = (candidate: Candidate): string => {
    return candidate.id || candidate._id || '';
  };

  return (
    <>
      <Seo title="Track Attendance" />
      <Pageheader currentpage="Track Attendance" activepage="Pages" mainpage="Track Attendance" />
      <div className="space-y-6 mt-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Track Attendance</h1>
          <button
            onClick={loadCandidates}
            disabled={loading}
            className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Search Field */}
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <label htmlFor="searchInput" className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Name Search:
            </label>
            <input
              id="searchInput"
              type="text"
              placeholder="Search by candidate name or email..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-semibold">
              Candidates {loading ? '(...)' : `(${filteredCandidates.length})`}
            </h2>
          </div>
          <div className="bg-white">
            {loading && (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                Loading candidates...
              </div>
            )}
            {!loading && filteredCandidates.length === 0 && candidates.length > 0 && (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                No candidates match the search criteria
              </div>
            )}
            {!loading && filteredCandidates.length === 0 && candidates.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                No candidates found
              </div>
            )}
            {!loading && filteredCandidates.length > 0 && (
              <div className="divide-y divide-gray-200">
                {filteredCandidates.map((candidate) => {
                  const candidateId = getCandidateId(candidate);
                  if (!candidateId) return null;
                  
                  return (
                    <Link
                      key={candidateId}
                      href={`/track-attendance/${candidateId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            {candidate.fullName || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {candidate.email || 'N/A'}
                          </div>
                        </div>
                        <i className="ri-external-link-line text-gray-400"></i>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

