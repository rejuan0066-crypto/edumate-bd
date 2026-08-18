UPDATE public.students 
SET deleted_at = NOW() 
WHERE class_id = 'dea01e69-e7c2-470f-badf-742a767a00c7' 
AND id IN (
    '7f0bf5d3-afb1-4c6b-aefc-06eee241bccd',
    '97e5354d-68af-4e3b-a845-5b4901b6905d',
    '7a4edfa0-4063-400e-ac41-072f5cd4c874',
    'aca9414e-58a5-4055-9ecb-7aa3c83d6830',
    'cca58b17-418c-425e-a8a8-f1449371594d',
    'e445e695-9e79-4a6a-947f-233615245b3a',
    '265fe7e9-2943-40a1-a2b9-740db1789852',
    '34bc1a98-3c65-4c7f-a09c-372e0cb61ba3',
    '637ea970-e9e1-4a4d-87b4-4d57a47f167e',
    '2bffab7f-27cf-4d4e-9f6c-782881dc64a3',
    'c0c2619d-3d96-46e7-8b91-81587e38ce15',
    '1bd64223-e2c4-4f07-8fd1-a780e94a8597',
    '297ed2b1-1a43-4191-af54-04e0ff0f54ce'
);