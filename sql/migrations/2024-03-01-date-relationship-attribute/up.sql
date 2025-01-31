BEGIN;

INSERT INTO bookbrainz.relationship_attribute_type (id, parent, root, child_order, name, description)
VALUES
	  (3, NULL, 1, 0, 'Begin date', 'This attribute indicates when the relationship begin.'),
	  (4, NULL, 1, 0, 'End date', 'This attribute indicates when the relationship ended.');

      


INSERT INTO bookbrainz.relationship_type__attribute_type (relationship_type, attribute_type)
VALUES
        -- Author --
        (8, 3), 
        (8, 4),

        -- Marriage --
        (11,3),
        (11,4),

        -- Involved with --
        (12,3),
        (12,4),
                
        -- Member of Group --
        (13,3),
        (13,4),     

        -- Subgroup --
        (16,3),
        (16,4),   

        -- Collaboration --
        (19,3),
        (19,4),  

        -- translated   --
        (9,3),
        (9,4),  

        -- Adaptor --
        (62,3),
        (62,4),  

        -- Worked On --
        (1,3),
        (1,4),

        -- Artist --
        (33,3),
        (33,4),

        -- Illustrator --
        (2,3),
        (2,4),
        (29,3),
        (29,4),

        -- Photographer --
        (26,3),
        (26,4),
        (59,3),
        (59,4),

        -- Penciller --
        (60,3),
        (60,4),

        -- Colourist --
        (61,3),
        (61,4),

        -- Inker --
        (30,3),
        (30,4),

        -- Letterer --
        (32,3),
        (32,4),

        -- Other --
        (58,3),
        (58,4),

        -- Editor --
        (5,3),
        (5,4),

        -- Proofreader --
        (22,3),
        (22,4),

        -- Compiler --
        (23,3),
        (23,4),

        -- Designer --
        (24,3),
        (24,4),

        -- Blurb --
        (27,3),
        (27,4),

        -- Art Director --
        (28,3),
        (28,4),

        -- Employee --
        (21,3),
        (21,4);




      
	
COMMIT;