import React from 'react';
import { SimpleTreeView } from '../shared/TreeView';
import { CircularProgress } from '@sistent/sistent';
import { RELATIONSHIPS } from '@/constants/navigator';
import MinusSquare from '../../assets/icons/MinusSquare';
import PlusSquare from '../../assets/icons/PlusSquare';
import DotSquare from '../../assets/icons/DotSquare';
import StyledTreeItem from './StyledTreeItem';

type RelationshipTreeProps = {
  expanded: string[];
  selected: string[];
  handleToggle: (_event: unknown, _nodeIds: string[]) => void;
  handleSelect: (_event: unknown, _nodeIds: string[]) => void;
  data: any[];
  setShowDetailsData: (_data: { type: string; data: any }) => void;
  view?: string;
  idForKindAsProp?: string;
  lastRegistrantRef?: React.MutableRefObject<any>;
  isRelationshipFetching?: boolean;
  searchText?: string | null;
};
import React, { useEffect, useMemo } from 'react';

const RelationshipTree = ({
  expanded,
  selected,
  handleToggle,
  handleSelect,
  data,
  setShowDetailsData,
  view = RELATIONSHIPS,
  idForKindAsProp,
  lastRegistrantRef,
  isRelationshipFetching,
  searchText = null,
}: RelationshipTreeProps) => {
  // Auto-expand parents when search finds nested items
  useEffect(() => {
    if (searchText) {
      const nodesToExpand: string[] = [];
      data.forEach((relationshipByKind, index) => {
        const idForKind =
          view === RELATIONSHIPS
            ? `${relationshipByKind.relationships[0].id}`
            : `${idForKindAsProp}.${relationshipByKind.relationships[0].id}`;

        // Check if any nested items match the search
        const hasMatch = relationshipByKind.relationships.some((relationship: any) => {
          const itemText = `${relationship.subType} ${relationship.model.name}`.toLowerCase();
          return itemText.includes(searchText.toLowerCase());
        });

        if (hasMatch) {
          nodesToExpand.push(idForKind);
        }
      });

      // Only update if there are changes to expand
      if (nodesToExpand.length > 0) {
        handleToggle(null, [...expanded, ...nodesToExpand.filter((id) => !expanded.includes(id))]);
      }
    }
  }, [searchText, data, view, idForKindAsProp, expanded, handleToggle]);

  // Filter relationships based on search text
  const filteredData = useMemo(() => {
    if (!searchText) return data;

    return data
      .map((relationshipByKind) => ({
        ...relationshipByKind,
        relationships: relationshipByKind.relationships.filter((relationship: any) => {
          const itemText = `${relationship.subType} ${relationship.model.name}`.toLowerCase();
          return itemText.includes(searchText.toLowerCase());
        }),
      }))
      .filter((relationshipByKind) => relationshipByKind.relationships.length > 0);
  }, [data, searchText]);
  return (
    <SimpleTreeView
      aria-label="controlled"
      slots={{ collapseIcon: MinusSquare, expandIcon: PlusSquare, endIcon: DotSquare }}
      onExpandedItemsChange={handleToggle}
      onSelectedItemsChange={handleSelect}
      multiSelect
      expandedItems={expanded}
      selectedItems={selected}
    >
      {filteredData.map((relationshipByKind, index) => {
        const idForKind =
          view === RELATIONSHIPS
            ? `${relationshipByKind.relationships[0].id}`
            : `${idForKindAsProp}.${relationshipByKind.relationships[0].id}`;
        return (
          <StyledTreeItem
            key={index}
            itemId={idForKind}
            data-id={idForKind}
            labelText={`${relationshipByKind.kind} (${relationshipByKind.relationships.length})`}
            onClick={() => {
              setShowDetailsData({
                type: 'none',
                data: {
                  id: relationshipByKind.relationships[0].id,
                },
              });
            }}
          >
            {relationshipByKind.relationships.map((relationship) => (
              <StyledTreeItem
                key={index}
                itemId={`${idForKind}.${relationship.id}`}
                data-id={`${idForKind}.${relationship.id}`}
                labelText={`${relationship.subType} (${relationship.model.name})`}
                onClick={() => {
                  setShowDetailsData({
                    type: RELATIONSHIPS,
                    data: relationship,
                  });
                }}
              />
            ))}
          </StyledTreeItem>
        );
      })}
      <div ref={lastRegistrantRef} style={{ height: '48px' }}></div>
      {isRelationshipFetching ? <CircularProgress color="inherit" /> : null}
    </SimpleTreeView>
  );
};

export default RelationshipTree;
