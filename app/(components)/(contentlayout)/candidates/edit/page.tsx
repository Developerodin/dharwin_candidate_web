"use client"
import { Basicwizard } from '@/shared/data/pages/candidates/candidateform';
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import Link from 'next/link';
import React, { Fragment, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchCandidateById } from '@/shared/lib/candidates';

const AddCandidate = () => {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const [initialData, setInitialData] = useState<any | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const load = async () => {
            if (!id) { setLoading(false); return; }
            try {
                const data = await fetchCandidateById(id);
                setInitialData(data);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    console.log(initialData);

    return (
        <Fragment>
            <Seo title={""} />
            <Pageheader currentpage="Edit Candidate" activepage="Candidates" mainpage="Edit Candidate" />
            <div className="container">
                <div className="grid grid-cols-12">
                    <div className="col-span-12">
                        <div className="box overflow-hidden">
                            <div className='box-body !p-0  product-checkout'>
                                {loading ? <div className='p-6'>Loading...</div> : <Basicwizard initialData={initialData} />}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Fragment>
    )
}

export default AddCandidate